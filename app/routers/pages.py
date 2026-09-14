from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from app.config import settings

router = APIRouter(tags=["pages"])

# The Jinja2 templates these routes used to render (landing.html,
# search.html, detail.html, ...) were the real frontend through Phase 1-2.
# The Next.js app in web/ (deployed to Vercel) has fully replaced them as
# of Phase 3 -- this backend's own job now is just the JSON API under
# /api/*, which is untouched by this file and still what the Next.js app's
# proxy talks to. These routes exist only so old links/bookmarks to
# garaly.onrender.com's pages land somewhere current instead of the frozen,
# increasingly-stale HTML that used to be here (it drifted out of sync with
# the API in Phase 3 -- e.g. the old dashboard's accept/decline buttons
# call a booking-status endpoint that no longer exists).
#
# 307 (not 301) deliberately: this isn't necessarily permanent yet (no real
# custom domain decided on), and 307 keeps it trivially reversible without
# browsers/crawlers caching it as a permanent move.


def _redirect(request: Request, path: str) -> RedirectResponse:
    query = f"?{request.url.query}" if request.url.query else ""
    return RedirectResponse(url=f"{settings.frontend_url}{path}{query}", status_code=307)


@router.get("/")
async def landing(request: Request):
    return _redirect(request, "/")


@router.get("/search")
async def search(request: Request):
    return _redirect(request, "/search")


@router.get("/listing/{space_id}")
async def listing_detail(space_id: str, request: Request):
    return _redirect(request, f"/listing/{space_id}")


@router.get("/login")
async def login_page(request: Request):
    return _redirect(request, "/login")


@router.get("/register")
async def register_page(request: Request):
    return _redirect(request, "/register")


@router.get("/list-space")
async def list_space_page(request: Request):
    return _redirect(request, "/list-space")


@router.get("/dashboard")
async def dashboard_page(request: Request):
    return _redirect(request, "/dashboard")


@router.get("/my-bookings")
async def my_bookings_page(request: Request):
    # /my-bookings no longer exists as its own page in the new app -- it
    # was folded into the dashboard's Bookings tab.
    return _redirect(request, "/dashboard")


@router.get("/about")
async def about_page(request: Request):
    return _redirect(request, "/about")
