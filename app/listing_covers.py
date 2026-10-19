"""Shared by every endpoint that returns a page of Space rows (search,
my-listings, saved, admin queue) to attach each space's photos without an
N+1 query per row -- one query for the whole page's worth of space_ids,
same pattern as the review-stats aggregation in routers/spaces.py.
list/search cards only ever show the first photo, but the full list is
returned (same shape GET /api/spaces/{id} already returns) in case a
future card wants to do more with it.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SpaceImage
from app.schemas import SpaceImageOut


async def images_by_space(db: AsyncSession, space_ids: list[str]) -> dict[str, list[SpaceImageOut]]:
    if not space_ids:
        return {}
    result = await db.execute(
        select(SpaceImage).where(SpaceImage.space_id.in_(space_ids)).order_by(SpaceImage.space_id, SpaceImage.sort_order)
    )
    by_space: dict[str, list[SpaceImageOut]] = {}
    for img in result.scalars().all():
        by_space.setdefault(img.space_id, []).append(SpaceImageOut.model_validate(img))
    return by_space
