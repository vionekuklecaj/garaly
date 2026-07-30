import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Cookie, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Session as SessionModel
from app.models import User

SESSION_COOKIE_NAME = "garaly_session"

# Using the `bcrypt` library directly (instead of via passlib) -- passlib's
# bcrypt backend has known incompatibilities with recent bcrypt releases.
# bcrypt has a hard 72-byte input limit; truncating is the standard,
# safe way to handle longer passwords (still effectively high-entropy
# well past 72 bytes).
_MAX_PW_BYTES = 72


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:_MAX_PW_BYTES]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    pw_bytes = password.encode("utf-8")[:_MAX_PW_BYTES]
    try:
        return bcrypt.checkpw(pw_bytes, password_hash.encode("utf-8"))
    except ValueError:
        return False


async def create_session(db: AsyncSession, user_id: str) -> str:
    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.session_max_age)
    db.add(SessionModel(token=token, user_id=user_id, expires_at=expires_at))
    await db.commit()
    return token


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.session_max_age,
        httponly=True,           # not readable by JS -> mitigates XSS token theft
        secure=settings.cookie_secure,  # must be True in production (HTTPS only)
        samesite="lax",          # sensible default CSRF mitigation for a normal web app
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")


async def invalidate_session(db: AsyncSession, token: str) -> None:
    await db.execute(delete(SessionModel).where(SessionModel.token == token))
    await db.commit()


async def get_current_user(
    garaly_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not garaly_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    result = await db.execute(
        select(SessionModel).where(SessionModel.token == garaly_session)
    )
    session_row = result.scalar_one_or_none()

    if session_row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    expires_at = session_row.expires_at
    if expires_at.tzinfo is None:
        # SQLite (used only in local dev) doesn't preserve tzinfo on read;
        # Postgres always returns tz-aware datetimes here.
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    user = await db.get(User, session_row.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    return user


async def get_current_user_optional(
    garaly_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Like get_current_user, but returns None instead of raising -- for pages
    that render differently when logged in vs logged out but work for both."""
    if not garaly_session:
        return None
    try:
        return await get_current_user(garaly_session, db)
    except HTTPException:
        return None
