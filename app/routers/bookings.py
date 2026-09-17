from datetime import date, timezone, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.availability import has_conflicting_booking
from app.database import get_db
from app.models import Booking, Review, Space, User
from app.schemas import BookingCreate, BookingDetailOut, BookingOut

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reserving is instant -- no host approval step. A booking is
    confirmed the moment it's created; the only gate is date-conflict
    checking, same as before."""
    space = await db.get(Space, data.space_id)
    if space is None or not space.is_active or space.status != "approved":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")
    if space.owner_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't book your own space")

    if await has_conflicting_booking(
        db,
        data.space_id,
        data.move_in_date,
        data.move_out_date,
        move_in_time=data.move_in_time,
        move_out_time=data.move_out_time,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This space is already booked for part of the selected period",
        )

    booking = Booking(
        space_id=data.space_id,
        renter_id=user.id,
        move_in_date=data.move_in_date,
        move_out_date=data.move_out_date,
        move_in_time=data.move_in_time,
        move_out_time=data.move_out_time,
        custom_period_note=data.custom_period_note,
        status="confirmed",
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


def _is_past(move_out: date) -> bool:
    return move_out < datetime.now(timezone.utc).date()


@router.get("/me", response_model=list[BookingDetailOut])
async def my_bookings(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Bookings the current user made as a renter."""
    result = await db.execute(
        select(Booking, Space)
        .join(Space, Booking.space_id == Space.id)
        .where(Booking.renter_id == user.id, Booking.status != "blocked")
        .order_by(Booking.created_at.desc())
    )
    rows = result.all()

    reviewed_ids: set[str] = set()
    if rows:
        booking_ids = [b.id for b, _ in rows]
        reviewed = await db.execute(select(Review.booking_id).where(Review.booking_id.in_(booking_ids)))
        reviewed_ids = {r for (r,) in reviewed.all()}

    out = []
    for booking, space in rows:
        is_past = _is_past(booking.move_out_date)
        out.append(
            BookingDetailOut(
                **BookingOut.model_validate(booking).model_dump(),
                space_title=space.title,
                space_city=space.city,
                is_past=is_past,
                can_review=(is_past and booking.status == "confirmed" and booking.id not in reviewed_ids),
            )
        )
    return out


@router.get("/received", response_model=list[BookingDetailOut])
async def received_bookings(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Reservations made on the current user's own listings -- powers the
    dashboard's bookings tab. Excludes the host's own blocked-date entries
    (see routers/spaces.py's block_dates endpoints); those are a separate
    "manage availability" concept, not a customer booking to review here."""
    result = await db.execute(
        select(Booking, Space, User)
        .join(Space, Booking.space_id == Space.id)
        .join(User, Booking.renter_id == User.id)
        .where(Space.owner_id == user.id, Booking.status != "blocked")
        .order_by(Booking.created_at.desc())
    )
    out = []
    for booking, space, renter in result.all():
        out.append(
            BookingDetailOut(
                **BookingOut.model_validate(booking).model_dump(),
                space_title=space.title,
                space_city=space.city,
                renter_name=renter.name,
                renter_email=renter.email,
                is_past=_is_past(booking.move_out_date),
            )
        )
    return out


@router.patch("/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(
    booking_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A renter cancelling their own upcoming reservation. There's no host
    accept/decline anymore (booking is instant), but a renter can still
    back out of a stay that hasn't started yet -- same as any direct-book
    marketplace."""
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.renter_id != user.id or booking.status == "blocked":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.status != "confirmed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking already resolved")

    if booking.move_in_date <= datetime.now(timezone.utc).date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can't cancel a reservation that's already started",
        )

    booking.status = "cancelled"
    await db.commit()
    await db.refresh(booking)
    return booking
