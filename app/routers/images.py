import asyncio

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Space, SpaceImage, User
from app.schemas import SpaceImageOut

router = APIRouter(prefix="/api/spaces", tags=["images"])

MAX_IMAGES_PER_SPACE = 8
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

_configured = False


def _ensure_cloudinary_configured() -> None:
    global _configured
    if not (settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Image uploads aren't configured")
    if not _configured:
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True,
        )
        _configured = True


async def _get_owned_space(db: AsyncSession, space_id: str, user: User) -> Space:
    space = await db.get(Space, space_id)
    if space is None or space.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")
    return space


@router.post("/{space_id}/images", response_model=SpaceImageOut, status_code=status.HTTP_201_CREATED)
async def upload_image(
    space_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _ensure_cloudinary_configured()
    await _get_owned_space(db, space_id, user)

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only JPEG/PNG/WEBP/GIF images are allowed")

    count = (
        await db.execute(select(func.count()).select_from(SpaceImage).where(SpaceImage.space_id == space_id))
    ).scalar_one()
    if count >= MAX_IMAGES_PER_SPACE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A listing can have at most {MAX_IMAGES_PER_SPACE} photos",
        )

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image must be under 8 MB")

    try:
        # cloudinary's SDK is sync/blocking -- offload so it doesn't stall
        # the event loop (and every other in-flight request) for the
        # duration of the upload.
        result = await asyncio.to_thread(
            cloudinary.uploader.upload, contents, folder="garaly/spaces", resource_type="image"
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Image upload failed") from exc

    image = SpaceImage(space_id=space_id, url=result["secure_url"], sort_order=count)
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return image


@router.delete("/{space_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    space_id: str,
    image_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_space(db, space_id, user)
    image = await db.get(SpaceImage, image_id)
    if image is None or image.space_id != space_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    # Removes the DB record; the Cloudinary asset itself is left in place
    # (a small storage-only cost -- not worth tracking public_ids just to
    # call destroy() on every delete for an app this size yet).
    await db.delete(image)
    await db.commit()
