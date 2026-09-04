import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

import bcrypt
import jwt

from app.core.config import get_settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(user_id: UUID) -> tuple[str, int]:
    settings = get_settings()
    expires_in = settings.access_token_expire_minutes * 60
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "exp": expires_at,
        "type": "access",
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str) -> UUID:
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("invalid token type")
    return UUID(payload["sub"])


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def refresh_token_expires_at() -> datetime:
    settings = get_settings()
    return datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
