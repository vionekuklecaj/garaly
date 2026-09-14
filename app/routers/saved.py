from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import SavedListing, Space, User
from app.schemas import SpaceOut

router = APIRouter(tags=["saved"])


@router.get("/api/saved", response_model=list[SpaceOut])
async def list_saved(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Space)
        .join(SavedListing, SavedListing.space_id == Space.id)
        .where(SavedListing.user_id == user.id)
        .order_by(SavedListing.created_at.desc())
    )
    return result.scalars().all()


@router.post("/api/spaces/{space_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def save_listing(space_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    space = await db.get(Space, space_id)
    if space is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")

    existing = await db.get(SavedListing, {"user_id": user.id, "space_id": space_id})
    if existing is None:
        db.add(SavedListing(user_id=user.id, space_id=space_id))
        await db.commit()
    # Already saved -- treat as success rather than an error, so a double
    # click (or two tabs) doesn't surface a confusing failure.


@router.delete("/api/spaces/{space_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_listing(space_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = await db.get(SavedListing, {"user_id": user.id, "space_id": space_id})
    if existing is not None:
        await db.delete(existing)
        await db.commit()
