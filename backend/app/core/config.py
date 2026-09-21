from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5433/event_app"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    log_level: str = "INFO"
    jwt_secret_key: str = "dev-secret-change-in-production-32b"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    storage_backend: str = "filesystem"
    storage_local_path: str = "/tmp/event-app-storage"
    storage_public_url_base: str = "http://127.0.0.1:8080/storage"
    s3_endpoint_url: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_bucket: str = "event-app-images"


@lru_cache
def get_settings() -> Settings:
    return Settings()
