from datetime import date, time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, get_current_user_optional
from app.availability import BLOCKING_STATUSES, has_conflicting_booking
from app.database import get_db
from app.models import Booking, Review, Space, User
from app.schemas import (
    AvailabilityOut,
    BlockDatesCreate,
    BookingOut,
    ReviewOut,
    SpaceCreate,
    SpaceOut,
    SpaceUpdate,
    UnavailableRangeOut,
)

router = APIRouter(prefix="/api/spaces", tags=["spaces"])

VALID_CATEGORIES = {"garages", "storage", "parking", "halls", "outdoor"}


async def _review_stats(db: AsyncSession, space_id: str) -> tuple[float | None, int]:
    row = (
        await db.execute(
            select(func.avg(Review.rating), func.count(Review.id)).where(Review.space_id == space_id)
        )
    ).one()
    avg, count = row
    return (round(float(avg), 1) if avg is not None else None), count


@router.get("", response_model=dict)
async def list_spaces(
    city: str | None = Query(default=None),
    category: str | None = Query(default=None),
    radius_km: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """List/search publicly visible spaces -- active AND approved. Paginated
    -- never returns unbounded rows, which matters once there are thousands
    of listings.

    `radius_km` is accepted but not yet applied: true "within N km" search
    needs a lat/lng per listing (via a geocoding API), which Space doesn't
    have yet. Once `Space.latitude`/`Space.longitude` are populated, this is
    where a bounding-box + haversine distance filter would go. For now,
    matching is by city name only.
    """
    base_filter = (Space.is_active.is_(True), Space.status == "approved")
    stmt = select(Space).where(*base_filter)
    count_stmt = select(func.count()).select_from(Space).where(*base_filter)

    if city:
        stmt = stmt.where(Space.city.ilike(f"%{city}%"))
        count_stmt = count_stmt.where(Space.city.ilike(f"%{city}%"))
    if category and category != "all":
        if category not in VALID_CATEGORIES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")
        stmt = stmt.where(Space.category == category)
        count_stmt = count_stmt.where(Space.category == category)

    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Space.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()

    return {
        "items": [SpaceOut.model_validate(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/stats", response_model=dict)
async def space_stats(db: AsyncSession = Depends(get_db)):
    """Aggregate counts for the landing page hero stats. Must be declared
    before /{space_id}."""
    base_filter = (Space.is_active.is_(True), Space.status == "approved")
    total_spaces = (await db.execute(select(func.count()).select_from(Space).where(*base_filter))).scalar_one()
    total_cities = (
        await db.execute(select(func.count(func.distinct(Space.city))).where(*base_filter))
    ).scalar_one()
    return {"total_spaces": total_spaces, "total_cities": total_cities}


@router.get("/mine", response_model=list[SpaceOut])
async def my_spaces(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """The current user's own listings, including inactive/pending/rejected
    ones -- powers the host dashboard. Must be declared before /{space_id}
    so "mine" isn't parsed as a space id."""
    result = await db.execute(
        select(Space).where(Space.owner_id == user.id).order_by(Space.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{space_id}", response_model=SpaceOut)
async def get_space(
    space_id: str,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    space = await db.get(Space, space_id, options=[selectinload(Space.images)])
    if space is None or not space.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")
    # A pending/rejected listing is only visible to its own owner (so they
    # can see status and preview it) -- everyone else gets 404, same as if
    # it didn't exist.
    is_owner = bool(user and user.id == space.owner_id)
    if space.status != "approved" and not is_owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")

    # The detail page shows who's hosting -- there's no public "get user by
    # id" endpoint (and shouldn't be, to avoid exposing emails), so the
    # owner's name rides along on the space response instead.
    owner = await db.get(User, space.owner_id)
    avg, count = await _review_stats(db, space_id)
    out = SpaceOut.model_validate(space)
    out.owner_name = owner.name if owner else None
    out.review_average = avg
    out.review_count = count
    return out


@router.get("/{space_id}/availability", response_model=AvailabilityOut)
async def check_availability(
    space_id: str,
    move_in: date = Query(...),
    move_out: date = Query(...),
    move_in_time: time | None = Query(default=None),
    move_out_time: time | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    if move_out < move_in:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="move_out must be on or after move_in")
    if (move_in_time is None) != (move_out_time is None):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="move_in_time and move_out_time must be set together")

    space = await db.get(Space, space_id)
    if space is None or not space.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")

    conflict = await has_conflicting_booking(
        db, space_id, move_in, move_out, move_in_time=move_in_time, move_out_time=move_out_time
    )
    return AvailabilityOut(available=not conflict)


@router.get("/{space_id}/unavailable-dates", response_model=list[UnavailableRangeOut])
async def list_unavailable_dates(space_id: str, db: AsyncSession = Depends(get_db)):
    """Every full-day booked/blocked range for this space, from today
    onward -- lets the booking calendar shade unavailable days without a
    round trip per date. Past ranges are excluded since they can't affect
    what's bookable going forward.

    Hourly bookings (move_in_time set) are deliberately excluded here: they
    only take up part of a day, so showing that whole day as booked on the
    calendar would be misleading -- other hours are still free. The
    day-level calendar only needs to know about bookings that take the
    *entire* day; hour-level conflicts are caught by the live availability
    check when someone's actually picking hours on a specific day."""
    result = await db.execute(
        select(Booking.move_in_date, Booking.move_out_date).where(
            Booking.space_id == space_id,
            Booking.status.in_(BLOCKING_STATUSES),
            Booking.move_out_date >= date.today(),
            Booking.move_in_time.is_(None),
        )
    )
    return [UnavailableRangeOut(move_in_date=r.move_in_date, move_out_date=r.move_out_date) for r in result.all()]


@router.post("", response_model=SpaceOut, status_code=status.HTTP_201_CREATED)
async def create_space(
    data: SpaceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")

    payload = data.model_dump()
    payload["amenities"] = ",".join(payload["amenities"])
    # status intentionally not set here -- Space.status's own model default
    # ("pending_review") applies, so every new listing goes through
    # moderation. See startup_migrations.py for why existing rows differ.
    space = Space(owner_id=user.id, **payload)
    db.add(space)
    await db.commit()
    await db.refresh(space)
    return space


async def _get_owned_space(db: AsyncSession, space_id: str, user: User) -> Space:
    space = await db.get(Space, space_id)
    if space is None or space.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")
    return space


@router.patch("/{space_id}", response_model=SpaceOut)
async def update_space(
    space_id: str,
    data: SpaceUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    space = await _get_owned_space(db, space_id, user)

    updates = data.model_dump(exclude_unset=True)
    if "category" in updates and updates["category"] not in VALID_CATEGORIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")
    if "amenities" in updates:
        updates["amenities"] = ",".join(updates["amenities"])

    for key, value in updates.items():
        setattr(space, key, value)

    await db.commit()
    await db.refresh(space)
    return space


@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_space(
    space_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivates rather than hard-deletes: a real DELETE would cascade to
    every Booking row on this space (see the cascade on Space.bookings in
    models.py), wiping renters' own booking/review history along with it.
    Removing it from search and marking it inactive gets the host the
    outcome they want ("take this listing down") without destroying data
    that isn't only theirs."""
    space = await _get_owned_space(db, space_id, user)
    space.is_active = False
    await db.commit()


# ---------- Host-managed blocked dates ----------

@router.get("/{space_id}/block-dates", response_model=list[BookingOut])
async def list_blocked_dates(
    space_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_space(db, space_id, user)
    result = await db.execute(
        select(Booking)
        .where(Booking.space_id == space_id, Booking.status == "blocked")
        .order_by(Booking.move_in_date)
    )
    return result.scalars().all()


@router.post("/{space_id}/block-dates", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def block_dates(
    space_id: str,
    data: BlockDatesCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A host marking their own space unavailable for a date range (e.g.
    "not renting out my garage next month") -- reuses the Booking table
    with status="blocked" and renter_id set to the host's own id, rather
    than a separate table, so the existing conflict-checking logic in
    availability.py just works for it too."""
    await _get_owned_space(db, space_id, user)

    if await has_conflicting_booking(db, space_id, data.move_in_date, data.move_out_date):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This overlaps an existing booking or blocked range",
        )

    block = Booking(
        space_id=space_id,
        renter_id=user.id,
        move_in_date=data.move_in_date,
        move_out_date=data.move_out_date,
        custom_period_note=data.note,
        status="blocked",
    )
    db.add(block)
    await db.commit()
    await db.refresh(block)
    return block


@router.delete("/{space_id}/block-dates/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_dates(
    space_id: str,
    booking_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_space(db, space_id, user)
    block = await db.get(Booking, booking_id)
    if block is None or block.space_id != space_id or block.status != "blocked":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blocked range not found")
    await db.delete(block)
    await db.commit()


@router.get("/{space_id}/reviews", response_model=list[ReviewOut])
async def list_space_reviews(space_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review, User)
        .join(User, Review.renter_id == User.id)
        .where(Review.space_id == space_id)
        .order_by(Review.created_at.desc())
    )
    out = []
    for review, renter in result.all():
        item = ReviewOut.model_validate(review)
        item.renter_name = renter.name
        out.append(item)
    return out
