from datetime import date

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Booking

# A space is considered unavailable for a requested range if there's a
# confirmed booking or a host self-block overlapping it. "accepted" is kept
# for backward compatibility with rows created before booking became
# instant-confirm (see Booking.status in models.py) -- new rows only ever
# use "confirmed" or "blocked".
BLOCKING_STATUSES = ("confirmed", "accepted", "blocked")


async def has_conflicting_booking(
    db: AsyncSession,
    space_id: str,
    move_in: date,
    move_out: date,
    exclude_booking_id: str | None = None,
) -> bool:
    """True if an accepted booking on this space overlaps [move_in, move_out].

    Two inclusive ranges [a_start, a_end] and [b_start, b_end] overlap iff
    a_start <= b_end AND b_start <= a_end.
    """
    stmt = select(Booking.id).where(
        and_(
            Booking.space_id == space_id,
            Booking.status.in_(BLOCKING_STATUSES),
            Booking.move_in_date <= move_out,
            Booking.move_out_date >= move_in,
        )
    )
    if exclude_booking_id:
        stmt = stmt.where(Booking.id != exclude_booking_id)

    result = await db.execute(stmt.limit(1))
    return result.scalar_one_or_none() is not None
