from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_admin
from app.database import get_db
from app.models import Space, User
from app.schemas import AdminSpaceOut, ModerationDecision

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/spaces", response_model=list[AdminSpaceOut])
async def list_spaces_for_review(
    status_filter: str = Query(default="pending_review", alias="status"),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """The moderation queue. Defaults to pending_review; pass
    ?status=approved or ?status=rejected to see the rest of the history."""
    result = await db.execute(
        select(Space, User)
        .join(User, Space.owner_id == User.id)
        .where(Space.status == status_filter)
        .order_by(Space.created_at.asc())
    )
    out = []
    for space, owner in result.all():
        item = AdminSpaceOut.model_validate(space)
        item.owner_name = owner.name
        item.owner_email = owner.email
        out.append(item)
    return out


@router.post("/spaces/{space_id}/decision", response_model=AdminSpaceOut)
async def decide_space(
    space_id: str,
    data: ModerationDecision,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    space = await db.get(Space, space_id)
    if space is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")

    space.status = data.status
    await db.commit()
    await db.refresh(space)

    owner = await db.get(User, space.owner_id)
    out = AdminSpaceOut.model_validate(space)
    out.owner_name = owner.name if owner else None
    out.owner_email = owner.email if owner else None
    return out
