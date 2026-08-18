from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.availability import has_conflicting_booking
from app.database import get_db
from app.models import Booking, Space, User
from app.schemas import BookingCreate, BookingDetailOut, BookingOut, BookingStatusUpdate

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    space = await db.get(Space, data.space_id)
    if space is None or not space.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")
    if space.owner_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't book your own space")

    if await has_conflicting_booking(db, data.space_id, data.move_in_date, data.move_out_date):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This space is already booked for part of the selected period",
        )

    booking = Booking(
        space_id=data.space_id,
        renter_id=user.id,
        move_in_date=data.move_in_date,
        move_out_date=data.move_out_date,
        custom_period_note=data.custom_period_note,
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


@router.get("/me", response_model=list[BookingDetailOut])
async def my_bookings(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Bookings the current user made as a renter."""
    result = await db.execute(
        select(Booking, Space)
        .join(Space, Booking.space_id == Space.id)
        .where(Booking.renter_id == user.id)
        .order_by(Booking.created_at.desc())
    )
    out = []
    for booking, space in result.all():
        out.append(
            BookingDetailOut(
                **BookingOut.model_validate(booking).model_dump(),
                space_title=space.title,
                space_city=space.city,
            )
        )
    return out


@router.get("/received", response_model=list[BookingDetailOut])
async def received_bookings(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Booking requests made on the current user's own listings -- powers the
    host dashboard's request list."""
    result = await db.execute(
        select(Booking, Space, User)
        .join(Space, Booking.space_id == Space.id)
        .join(User, Booking.renter_id == User.id)
        .where(Space.owner_id == user.id)
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
            )
        )
    return out


@router.patch("/{booking_id}", response_model=BookingOut)
async def update_booking_status(
    booking_id: str,
    data: BookingStatusUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept or decline a booking request. Only the space's owner may do
    this -- ownership is checked via a join, not trusted from the client."""
    booking = await db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    space = await db.get(Space, booking.space_id)
    if space is None or space.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your listing")

    if booking.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking already resolved")

    if data.status == "accepted":
        # Re-check for conflicts at accept-time too: two renters could have
        # both requested overlapping dates while both were still pending.
        conflict = await has_conflicting_booking(
            db, booking.space_id, booking.move_in_date, booking.move_out_date, exclude_booking_id=booking.id
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another request for overlapping dates was already accepted",
            )

    booking.status = data.status
    await db.commit()
    await db.refresh(booking)
    return booking
