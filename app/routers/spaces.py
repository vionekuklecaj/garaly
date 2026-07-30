from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Space, User
from app.schemas import SpaceCreate, SpaceOut

router = APIRouter(prefix="/api/spaces", tags=["spaces"])

VALID_CATEGORIES = {"garages", "storage", "parking", "halls", "cellars", "outdoor"}


@router.get("", response_model=dict)
async def list_spaces(
    city: str | None = Query(default=None),
    category: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """List/search active spaces. Paginated -- never returns unbounded rows,
    which matters once there are thousands of listings."""
    stmt = select(Space).where(Space.is_active.is_(True))
    count_stmt = select(func.count()).select_from(Space).where(Space.is_active.is_(True))

    if city:
        stmt = stmt.where(Space.city.ilike(f"%{city}%"))
        count_stmt = count_stmt.where(Space.city.ilike(f"%{city}%"))
    if category and category != "all":
        if category not in VALID_CATEGORIES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")
        stmt = stmt.where(Space.category == category)
        count_stmt = count_stmt.where(Space.category == category)

    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Space.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()

    return {
        "items": [SpaceOut.model_validate(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{space_id}", response_model=SpaceOut)
async def get_space(space_id: str, db: AsyncSession = Depends(get_db)):
    space = await db.get(Space, space_id)
    if space is None or not space.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")
    return space


@router.post("", response_model=SpaceOut, status_code=status.HTTP_201_CREATED)
async def create_space(
    data: SpaceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")

    space = Space(owner_id=user.id, **data.model_dump())
    db.add(space)
    await db.commit()
    await db.refresh(space)
    return space
