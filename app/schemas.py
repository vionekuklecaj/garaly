from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator, model_validator

from app.constants import AMENITY_KEYS


# ---------- Users / Auth ----------

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    is_admin: bool = False
    created_at: datetime


class AccountUpdate(BaseModel):
    """PATCH /api/auth/me. Changing email or password requires
    current_password -- a stolen/leftover session cookie shouldn't be
    enough on its own to take over the account."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None
    new_password: str | None = Field(default=None, min_length=8, max_length=128)
    current_password: str | None = None

    @model_validator(mode="after")
    def require_current_password_for_sensitive_changes(self):
        if (self.email is not None or self.new_password is not None) and not self.current_password:
            raise ValueError("current_password is required to change email or password")
        return self


# ---------- Images ----------

class SpaceImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    space_id: str
    url: str
    sort_order: int
    created_at: datetime


# ---------- Spaces ----------

def _validate_amenities(keys: list[str]) -> list[str]:
    unknown = set(keys) - AMENITY_KEYS
    if unknown:
        raise ValueError(f"Unknown amenity keys: {', '.join(sorted(unknown))}")
    # De-dupe while keeping a stable order rather than trusting client order.
    return [k for k in AMENITY_KEYS if k in keys]


class SpaceCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description: str = ""
    category: str
    city: str = Field(min_length=1, max_length=120)
    address: str = ""
    zip_code: str = Field(default="", max_length=20)
    amenities: list[str] = Field(default_factory=list)
    price_month: float = Field(gt=0)
    size_sqm: float | None = Field(default=None, gt=0)

    @field_validator("amenities")
    @classmethod
    def _check_amenities(cls, v: list[str]) -> list[str]:
        return _validate_amenities(v)


class SpaceUpdate(BaseModel):
    """Partial update for PATCH /api/spaces/{id} -- every field optional,
    only what's provided gets changed. Deliberately excludes owner_id and
    status: ownership never changes, and moderation status only changes
    through the admin approve/reject endpoints, not the owner's own edits."""

    title: str | None = Field(default=None, min_length=3, max_length=160)
    description: str | None = None
    category: str | None = None
    city: str | None = Field(default=None, min_length=1, max_length=120)
    address: str | None = None
    zip_code: str | None = Field(default=None, max_length=20)
    amenities: list[str] | None = None
    price_month: float | None = Field(default=None, gt=0)
    size_sqm: float | None = Field(default=None, gt=0)
    is_active: bool | None = None

    @field_validator("amenities")
    @classmethod
    def _check_amenities(cls, v: list[str] | None) -> list[str] | None:
        return None if v is None else _validate_amenities(v)


class SpaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    title: str
    description: str
    category: str
    city: str
    address: str
    zip_code: str = ""
    amenities: list[str] = Field(default_factory=list)
    latitude: float | None = None
    longitude: float | None = None
    price_month: float
    size_sqm: float | None
    is_active: bool
    status: str = "approved"
    created_at: datetime
    # Only populated by GET /api/spaces/{id} (the detail page needs it,
    # nothing else does) -- see space_id route in routers/spaces.py.
    owner_name: str | None = None
    # Only populated where the route already has this without extra
    # queries (detail page, review summary lookups).
    review_average: float | None = None
    review_count: int = 0
    # Only populated by GET /api/spaces/{id} -- left empty on list/search
    # results to avoid an N+1 query there (the grid still shows the
    # category placeholder, same as before; real photos are a detail-page
    # thing).
    images: list[SpaceImageOut] = Field(default_factory=list)

    @field_validator("amenities", mode="before")
    @classmethod
    def _split_amenities(cls, v: object) -> list[str]:
        if isinstance(v, str):
            return [a for a in v.split(",") if a]
        return list(v) if v else []


class AdminSpaceOut(SpaceOut):
    """SpaceOut plus the host info the moderation queue needs to show
    without a second round trip."""
    owner_email: str | None = None


class ModerationDecision(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")


# ---------- Bookings ----------

class BookingCreate(BaseModel):
    space_id: str
    move_in_date: date
    move_out_date: date
    # Set when the renter wants a period different from what they searched
    # for -- shown to the host, doesn't change move_in_date/move_out_date.
    custom_period_note: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def check_date_order(self):
        if self.move_out_date < self.move_in_date:
            raise ValueError("move_out_date must be on or after move_in_date")
        return self


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    space_id: str
    renter_id: str
    move_in_date: date
    move_out_date: date
    custom_period_note: str
    status: str
    created_at: datetime


class BookingDetailOut(BookingOut):
    """BookingOut plus the bits of space/renter info the dashboards need to
    render a useful list without extra round trips per row."""
    space_title: str
    space_city: str
    renter_name: str | None = None
    renter_email: str | None = None
    # True once move_out_date is in the past -- the frontend uses this to
    # decide whether to offer "cancel" (future only) vs "leave a review"
    # (past, confirmed, not yet reviewed).
    is_past: bool = False
    can_review: bool = False


class BlockDatesCreate(BaseModel):
    move_in_date: date
    move_out_date: date
    note: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def check_date_order(self):
        if self.move_out_date < self.move_in_date:
            raise ValueError("move_out_date must be on or after move_in_date")
        return self


# ---------- Availability ----------

class AvailabilityOut(BaseModel):
    available: bool


# ---------- Reviews ----------

class ReviewCreate(BaseModel):
    booking_id: str
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1000)


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    space_id: str
    renter_id: str
    booking_id: str
    rating: int
    comment: str
    created_at: datetime
    renter_name: str | None = None
