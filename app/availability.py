from datetime import date

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Booking

# A space is considered unavailable for a requested range if there's an
# ACCEPTED booking that overlaps it. Pending requests don't block other
# renters from asking -- the host picks one when several people ask for
# overlapping dates, same as most marketplaces (Airbnb included).
BLOCKING_STATUSES = ("accepted",)


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
