from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Booking, Review, User
from app.schemas import ReviewCreate, ReviewOut

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    data: ReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Only the renter on a *completed* booking can review it -- one review
    per booking, enforced here (a friendly 400) and at the DB level (the
    unique constraint on Review.booking_id, as a backstop against a race
    between two concurrent requests)."""
    booking = await db.get(Booking, data.booking_id)
    if booking is None or booking.renter_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.status != "confirmed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only confirmed bookings can be reviewed")
    if booking.move_out_date >= datetime.now(timezone.utc).date():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can't review a stay that hasn't ended yet")

    existing = (
        await db.execute(select(Review).where(Review.booking_id == data.booking_id))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You've already reviewed this booking")

    review = Review(
        space_id=booking.space_id,
        renter_id=user.id,
        booking_id=booking.id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    out = ReviewOut.model_validate(review)
    out.renter_name = user.name
    return out
