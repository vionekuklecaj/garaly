from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_optional
from app.database import get_db
from app.models import Space, User
from app.translations import CATEGORIES, TEAM, get_translator

router = APIRouter(tags=["pages"])
templates = Jinja2Templates(directory="app/templates")


def _lang_from_request(request: Request) -> str:
    lang = request.query_params.get("lang") or request.cookies.get("garaly_lang") or "de"
    return lang if lang in ("de", "en") else "de"


async def _common_ctx(request: Request, db: AsyncSession, user: User | None) -> dict:
    lang = _lang_from_request(request)
    return {
        "request": request,
        "t": get_translator(lang),
        "lang": lang,
        "categories": CATEGORIES,
        "user": user,
    }


@router.get("/", response_class=HTMLResponse)
async def landing(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    ctx = await _common_ctx(request, db, user)

    total_spaces = (await db.execute(select(func.count()).select_from(Space).where(Space.is_active.is_(True)))).scalar_one()
    total_cities = (await db.execute(select(func.count(func.distinct(Space.city))).where(Space.is_active.is_(True)))).scalar_one()

    ctx.update(
        total_spaces=total_spaces,
        total_cities=total_cities,
    )
    return templates.TemplateResponse(request, "landing.html", ctx)


@router.get("/search", response_class=HTMLResponse)
async def search(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    ctx = await _common_ctx(request, db, user)
    ctx.update(
        city=request.query_params.get("city", ""),
        active_category=request.query_params.get("category", "all"),
        move_in=request.query_params.get("move_in", ""),
        move_out=request.query_params.get("move_out", ""),
        radius=request.query_params.get("radius", ""),
    )
    return templates.TemplateResponse(request, "search.html", ctx)


@router.get("/listing/{space_id}", response_class=HTMLResponse)
async def listing_detail(
    space_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    ctx = await _common_ctx(request, db, user)
    space = await db.get(Space, space_id)
    owner = await db.get(User, space.owner_id) if space else None
    ctx.update(
        space=space,
        space_id=space_id,
        owner=owner,
        move_in=request.query_params.get("move_in", ""),
        move_out=request.query_params.get("move_out", ""),
    )
    return templates.TemplateResponse(request, "detail.html", ctx)


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, db: AsyncSession = Depends(get_db), user: User | None = Depends(get_current_user_optional)):
    ctx = await _common_ctx(request, db, user)
    return templates.TemplateResponse(request, "login.html", ctx)


@router.get("/register", response_class=HTMLResponse)
async def register_page(request: Request, db: AsyncSession = Depends(get_db), user: User | None = Depends(get_current_user_optional)):
    ctx = await _common_ctx(request, db, user)
    return templates.TemplateResponse(request, "register.html", ctx)


@router.get("/list-space", response_class=HTMLResponse)
async def list_space_page(request: Request, db: AsyncSession = Depends(get_db), user: User | None = Depends(get_current_user_optional)):
    ctx = await _common_ctx(request, db, user)
    return templates.TemplateResponse(request, "list_space.html", ctx)


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request, db: AsyncSession = Depends(get_db), user: User | None = Depends(get_current_user_optional)):
    ctx = await _common_ctx(request, db, user)
    return templates.TemplateResponse(request, "dashboard.html", ctx)


@router.get("/my-bookings", response_class=HTMLResponse)
async def my_bookings_page(request: Request, db: AsyncSession = Depends(get_db), user: User | None = Depends(get_current_user_optional)):
    ctx = await _common_ctx(request, db, user)
    return templates.TemplateResponse(request, "my_bookings.html", ctx)


@router.get("/about", response_class=HTMLResponse)
async def about_page(request: Request, db: AsyncSession = Depends(get_db), user: User | None = Depends(get_current_user_optional)):
    ctx = await _common_ctx(request, db, user)
    ctx.update(team=TEAM)
    return templates.TemplateResponse(request, "about.html", ctx)
