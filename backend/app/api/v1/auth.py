from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.auth import LoginRequest, LogoutRequest, RefreshRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Annotated[Session, Depends(get_db)]) -> UserResponse:
    user = AuthService(db).register(
        email=payload.email,
        display_name=payload.display_name,
        password=payload.password,
    )
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    tokens = AuthService(db).login(email=payload.email, password=payload.password)
    return TokenResponse(
        access_token=tokens.access_token,
        expires_in=tokens.expires_in,
        refresh_token=tokens.refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    tokens = AuthService(db).refresh(payload.refresh_token)
    return TokenResponse(
        access_token=tokens.access_token,
        expires_in=tokens.expires_in,
        refresh_token=tokens.refresh_token,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: LogoutRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> None:
    AuthService(db).logout(payload.refresh_token)
