from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://garaly:garaly@localhost:5432/garaly"
    database_url_sync: str = "postgresql+psycopg2://garaly:garaly@localhost:5432/garaly"
    secret_key: str = "change-me-to-a-long-random-value"
    session_max_age: int = 60 * 60 * 24 * 30  # 30 days
    cookie_secure: bool = False
    environment: str = "development"

    # Listing photo uploads -- see routers/images.py. Blank by default so
    # the app still boots without them configured; the upload endpoint
    # returns a clear 503 instead of crashing if they're unset.
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # Where routers/pages.py redirects the old Jinja2 page routes to, now
    # that the Next.js app (in web/) is the real frontend. Override via env
    # var (no code change needed) once this points at a real custom domain
    # instead of the *.vercel.app URL.
    frontend_url: str = "https://garaly.vercel.app"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
