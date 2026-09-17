import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    # Grants access to the moderation queue (GET/POST /api/admin/*). No
    # self-serve way to become an admin -- granted via a one-off statement
    # in main.py's startup migration.
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    spaces: Mapped[list["Space"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="renter", cascade="all, delete-orphan")
    sessions: Mapped[list["Session"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    saved: Mapped[list["SavedListing"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    reviews: Mapped[list["Review"]] = relationship(back_populates="renter", cascade="all, delete-orphan")


class Session(Base):
    """Server-side session record backing the httpOnly session cookie.

    Storing sessions in Postgres (rather than in-memory on the app process)
    means any number of backend instances behind a load balancer can validate
    the same cookie. If session-lookup latency ever becomes a bottleneck at
    scale, swap this table for Redis without changing any calling code.
    """

    __tablename__ = "sessions"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)

    user: Mapped["User"] = relationship(back_populates="sessions")


class Space(Base):
    __tablename__ = "spaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(40), index=True, nullable=False)  # garage/storage/parking/hall/outdoor
    city: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    address: Mapped[str] = mapped_column(String(255), default="")
    zip_code: Mapped[str] = mapped_column(String(20), default="")
    # Comma-separated subset of the fixed amenity keys used across the
    # frontend (lighting/electricity/security/access/dry/parking) -- e.g.
    # "lighting,electricity,parking". Kept as a plain string rather than a
    # separate table since the catalog is small and fixed; empty string
    # means "amenities not specified" (frontend shows nothing, not "none").
    amenities: Mapped[str] = mapped_column(String(255), default="")
    # Not yet populated -- set these via a geocoding API (e.g. Google Geocoding)
    # when an address is saved, to enable real "within N km" radius search.
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    price_month: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    size_sqm: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    # Host-controlled pause/resume, independent of moderation status --
    # a listing can be approved but paused, or pending review and paused.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Moderation status: pending_review/approved/rejected. A listing is only
    # publicly visible (search, detail, /api/spaces list) when both
    # status == "approved" and is_active is True. The host still sees it
    # (with its status) on their own dashboard regardless.
    status: Mapped[str] = mapped_column(String(20), default="pending_review", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    owner: Mapped["User"] = relationship(back_populates="spaces")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="space", cascade="all, delete-orphan")
    # lazy="noload": SpaceOut.images mirrors this relationship name, and
    # SpaceOut gets built from plain Space rows all over routers/spaces.py
    # via SpaceOut.model_validate(row) -- without noload, any of those
    # (list_spaces, my_spaces, create_space, ...) would try to lazy-load
    # images inside an async context and blow up with a greenlet error.
    # noload makes an un-eager-loaded access come back as an empty list
    # instead; get_space explicitly opts back in with selectinload where
    # the images are actually needed.
    images: Mapped[list["SpaceImage"]] = relationship(
        back_populates="space", cascade="all, delete-orphan", order_by="SpaceImage.sort_order", lazy="noload"
    )
    reviews: Mapped[list["Review"]] = relationship(back_populates="space", cascade="all, delete-orphan")
    saved_by: Mapped[list["SavedListing"]] = relationship(back_populates="space", cascade="all, delete-orphan")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    space_id: Mapped[str] = mapped_column(String(36), ForeignKey("spaces.id"), index=True, nullable=False)
    renter_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    # Free date range rather than a preset duration -- supports single-day
    # bookings as well as long-term rentals.
    move_in_date: Mapped[date] = mapped_column(Date, nullable=False)
    move_out_date: Mapped[date] = mapped_column(Date, nullable=False)
    # Both null for a full-day (or multi-day) booking -- the historical/
    # default case. Both set together (validated in schemas.BookingCreate)
    # for an hourly booking, e.g. renting a garage for 3 hours -- only valid
    # when move_in_date == move_out_date, since hour granularity across
    # multiple days doesn't mean anything here. See availability.py for how
    # this changes conflict-checking: two hourly bookings on the same day
    # only conflict if their time windows actually overlap, instead of any
    # same-day booking blocking the whole day.
    move_in_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    move_out_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    # Optional free-text note when the renter wants a period different from
    # what they searched for.
    custom_period_note: Mapped[str] = mapped_column(Text, default="")
    # confirmed/cancelled/blocked. Booking used to go through a host
    # accept/decline step (pending/accepted/declined) -- that's gone, a
    # booking is confirmed the moment it's created (see create_booking in
    # routers/bookings.py). "blocked" is a host marking their own dates
    # unavailable (renter_id is the host's own id in that case; see
    # block_dates in routers/spaces.py) rather than a real booking. Old rows
    # from before this change may still carry pending/accepted/declined --
    # display code treats unrecognized statuses as informational only, and
    # only "confirmed"/"accepted"/"blocked" ever block availability (see
    # availability.py).
    status: Mapped[str] = mapped_column(String(20), default="confirmed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    space: Mapped["Space"] = relationship(back_populates="bookings")
    renter: Mapped["User"] = relationship(back_populates="bookings")


class SpaceImage(Base):
    __tablename__ = "space_images"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    space_id: Mapped[str] = mapped_column(String(36), ForeignKey("spaces.id"), index=True, nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    sort_order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    space: Mapped["Space"] = relationship(back_populates="images")


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    space_id: Mapped[str] = mapped_column(String(36), ForeignKey("spaces.id"), index=True, nullable=False)
    renter_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    # One review per booking -- enforced at the DB level (unique) as well as
    # in the route, so a renter can't leave multiple reviews off one stay.
    booking_id: Mapped[str] = mapped_column(String(36), ForeignKey("bookings.id"), unique=True, nullable=False)
    rating: Mapped[int] = mapped_column(nullable=False)  # 1-5, validated in schemas.ReviewCreate
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    space: Mapped["Space"] = relationship(back_populates="reviews")
    renter: Mapped["User"] = relationship(back_populates="reviews")


class SavedListing(Base):
    """A renter's favorites/wishlist entry. Composite primary key -- a user
    can save a given space at most once, saving again is a no-op rather
    than a duplicate row."""

    __tablename__ = "saved_listings"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    space_id: Mapped[str] = mapped_column(String(36), ForeignKey("spaces.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="saved")
    space: Mapped["Space"] = relationship(back_populates="saved_by")
