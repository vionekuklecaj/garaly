"""Pricing-tier math for Space.price_hour/day/week/month.

A host sets whichever tiers make sense for their space -- at least one is
required (enforced in schemas.py), but none are mandatory individually.
derive_rates() fills in any tier the host didn't set by deriving it from
whichever tier(s) were set, so every one of the four always has a usable
effective rate. calculate_total_price() then prices a booking by greedily
covering it with the largest tier first (a 10-day stay becomes 1 week + 3
days), falling through to the next smaller tier for the remainder.
"""
from datetime import date, datetime, time
from decimal import Decimal, ROUND_HALF_UP

HOURS_PER_DAY = Decimal(24)
DAYS_PER_WEEK = Decimal(7)
DAYS_PER_MONTH = Decimal(30)


def derive_rates(
    price_hour: Decimal | None,
    price_day: Decimal | None,
    price_week: Decimal | None,
    price_month: Decimal | None,
) -> dict[str, Decimal]:
    """Returns an {"hour"/"day"/"week"/"month": Decimal} rate for all four
    tiers. Each tier prefers its own host-set price; otherwise it's derived
    from the nearest set tier, then the next-nearest, and so on. The final
    fallback in every chain is price_hour -- reachable only when the other
    three are all unset, which (given at least one of the four must be set)
    means price_hour is guaranteed set in that case."""
    hour = price_hour
    if hour is None:
        if price_day is not None:
            hour = price_day / HOURS_PER_DAY
        elif price_week is not None:
            hour = price_week / (DAYS_PER_WEEK * HOURS_PER_DAY)
        else:
            hour = price_month / (DAYS_PER_MONTH * HOURS_PER_DAY)

    day = price_day
    if day is None:
        if price_week is not None:
            day = price_week / DAYS_PER_WEEK
        elif price_month is not None:
            day = price_month / DAYS_PER_MONTH
        else:
            day = price_hour * HOURS_PER_DAY

    week = price_week
    if week is None:
        if price_month is not None:
            week = price_month / DAYS_PER_MONTH * DAYS_PER_WEEK
        elif price_day is not None:
            week = price_day * DAYS_PER_WEEK
        else:
            week = price_hour * HOURS_PER_DAY * DAYS_PER_WEEK

    month = price_month
    if month is None:
        if price_week is not None:
            month = price_week / DAYS_PER_WEEK * DAYS_PER_MONTH
        elif price_day is not None:
            month = price_day * DAYS_PER_MONTH
        else:
            month = price_hour * HOURS_PER_DAY * DAYS_PER_MONTH

    return {"hour": hour, "day": day, "week": week, "month": month}


def calculate_total_price(
    price_hour: Decimal | None,
    price_day: Decimal | None,
    price_week: Decimal | None,
    price_month: Decimal | None,
    *,
    days: int,
    hours: Decimal | None,
) -> Decimal:
    """`days` is the inclusive day count of the booking (move_out - move_in
    + 1 day). `hours` is set only for an hourly, same-day booking, in which
    case `days` is ignored -- the hour rate alone prices it."""
    rates = derive_rates(price_hour, price_day, price_week, price_month)

    if hours is not None:
        total = rates["hour"] * hours
    else:
        remaining = days
        months, remaining = divmod(remaining, 30)
        weeks, remaining = divmod(remaining, 7)
        total = months * rates["month"] + weeks * rates["week"] + remaining * rates["day"]

    return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def price_for_period(
    price_hour: Decimal | None,
    price_day: Decimal | None,
    price_week: Decimal | None,
    price_month: Decimal | None,
    *,
    move_in_date: date,
    move_out_date: date,
    move_in_time: time | None,
    move_out_time: time | None,
) -> Decimal:
    """Same as calculate_total_price, but takes the booking's raw
    date/time fields instead of pre-derived days/hours -- the one place
    that duration math happens, shared by the quote endpoint (preview,
    before a booking exists) and the actual booking creation."""
    if move_in_time is not None:
        start = datetime.combine(date.min, move_in_time)
        end = datetime.combine(date.min, move_out_time)
        hours = Decimal((end - start).total_seconds()) / Decimal(3600)
        days = 1
    else:
        hours = None
        days = (move_out_date - move_in_date).days + 1

    return calculate_total_price(price_hour, price_day, price_week, price_month, days=days, hours=hours)
