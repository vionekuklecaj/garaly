from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://garaly:garaly@localhost:5432/garaly"
    database_url_sync: str = "postgresql+psycopg2://garaly:garaly@localhost:5432/garaly"
    secret_key: str = "change-me-to-a-long-random-value"
    session_max_age: int = 60 * 60 * 24 * 30  # 30 days
    cookie_secure: bool = False
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
