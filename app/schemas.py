from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, ConfigDict


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
    created_at: datetime


# ---------- Spaces ----------

class SpaceCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description: str = ""
    category: str
    city: str = Field(min_length=1, max_length=120)
    address: str = ""
    price_month: float = Field(gt=0)
    size_sqm: float | None = Field(default=None, gt=0)


class SpaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    title: str
    description: str
    category: str
    city: str
    address: str
    price_month: float
    size_sqm: float | None
    is_active: bool
    created_at: datetime


# ---------- Bookings ----------

class BookingCreate(BaseModel):
    space_id: str
    move_in_date: date
    duration_months: int = Field(ge=1, le=60)


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    space_id: str
    renter_id: str
    move_in_date: date
    duration_months: int
    status: str
    created_at: datetime
