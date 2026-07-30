from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.routers import auth_routes, bookings, pages, spaces


@asynccontextmanager
async def lifespan(app: FastAPI):
    # MVP convenience: auto-create tables on startup. Once you have real data
    # to protect, switch to Alembic migrations (already scaffolded in
    # alembic/) instead of relying on create_all.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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


@app.get("/health")
async def health():
    """Used by load balancers / uptime checks. Returning quickly and without
    touching the DB keeps it a cheap, reliable liveness signal."""
    return {"status": "ok"}
