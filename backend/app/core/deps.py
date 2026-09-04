from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User
from app.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> UUID:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(code="UNAUTHORIZED", message="認証が必要です", status_code=401)
    try:
        return decode_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise AppError(code="UNAUTHORIZED", message="認証が必要です", status_code=401) from exc


def get_current_user(
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    user = UserRepository(db).get_by_id(user_id)
    if user is None:
        raise AppError(code="UNAUTHORIZED", message="認証が必要です", status_code=401)
    return user


def get_optional_bearer_token(
    authorization: Annotated[str | None, Header()] = None,
) -> str | None:
    if authorization is None:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token
