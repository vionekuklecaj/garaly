from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    clear_session_cookie,
    create_session,
    get_current_user,
    hash_password,
    invalidate_session,
    set_session_cookie,
    verify_password,
    SESSION_COOKIE_NAME,
)
from app.database import get_db
from app.models import User
from app.schemas import UserLogin, UserOut, UserRegister
from fastapi import Cookie

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, response: Response, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=data.email, password_hash=hash_password(data.password), name=data.name)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = await create_session(db, user.id)
    set_session_cookie(response, token)
    return user


@router.post("/login", response_model=UserOut)
async def login(data: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # Same error for "no such user" and "wrong password" -- avoids leaking
    # which emails are registered.
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = await create_session(db, user.id)
    set_session_cookie(response, token)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    garaly_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    if garaly_session:
        await invalidate_session(db, garaly_session)
    clear_session_cookie(response)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user
