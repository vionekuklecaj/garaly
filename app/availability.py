from datetime import date, time

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
    move_in_time: time | None = None,
    move_out_time: time | None = None,
) -> bool:
    """True if a blocking booking on this space overlaps [move_in, move_out].

    Two inclusive date ranges [a_start, a_end] and [b_start, b_end] overlap
    iff a_start <= b_end AND b_start <= a_end -- that's the first pass,
    fetching every booking whose *date* range overlaps at all.

    Within that set, an hourly booking (move_in_time/move_out_time set,
    single day) only actually conflicts with another hourly booking on the
    same exact day if their time windows overlap too -- two people can
    rent the same garage for different hours on the same day. Any other
    combination (either side is a full-day/multi-day booking) keeps the
    original conservative behavior: any date overlap is a conflict, since
    a full-day booking has no "free hours" to share.
    """
    requested_is_hourly = move_in_time is not None and move_out_time is not None and move_in == move_out

    stmt = select(Booking.move_in_date, Booking.move_out_date, Booking.move_in_time, Booking.move_out_time).where(
        and_(
            Booking.space_id == space_id,
            Booking.status.in_(BLOCKING_STATUSES),
            Booking.move_in_date <= move_out,
            Booking.move_out_date >= move_in,
        )
    )
    if exclude_booking_id:
        stmt = stmt.where(Booking.id != exclude_booking_id)

    rows = (await db.execute(stmt)).all()

    for row in rows:
        existing_is_hourly = (
            row.move_in_time is not None and row.move_out_time is not None and row.move_in_date == row.move_out_date
        )
        if requested_is_hourly and existing_is_hourly and row.move_in_date == move_in:
            if move_in_time < row.move_out_time and row.move_in_time < move_out_time:
                return True
            continue  # same day, but the hours don't actually overlap
        return True  # a full-day/multi-day booking is involved -- date overlap is enough

    return False
