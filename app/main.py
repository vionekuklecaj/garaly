from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app import startup_migrations
from app.database import Base, engine
from app.routers import admin, auth_routes, bookings, images, pages, reviews, saved, spaces


@asynccontextmanager
async def lifespan(app: FastAPI):
    # MVP convenience: auto-create tables on startup. Once you have real data
    # to protect, switch to Alembic migrations instead of relying on
    # create_all. New columns on already-existing tables (which create_all
    # can't add) are handled by startup_migrations.run below.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await startup_migrations.run(conn)
    yield


app = FastAPI(title="Garaly", lifespan=lifespan)

# Compresses JSON/HTML responses over a size threshold -- cheap win for
# response time and bandwidth once traffic grows.
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(pages.router)
app.include_router(auth_routes.router)
app.include_router(spaces.router)
app.include_router(bookings.router)
app.include_router(admin.router)
app.include_router(saved.router)
app.include_router(reviews.router)
app.include_router(images.router)


@app.get("/health")
async def health():
    """Used by load balancers / uptime checks. Returning quickly and without
    touching the DB keeps it a cheap, reliable liveness signal."""
    return {"status": "ok"}
