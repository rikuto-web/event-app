from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    refresh_token_expires_at,
    verify_password,
)
from app.models import User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository


@dataclass
class TokenPair:
    access_token: str
    expires_in: int
    refresh_token: str


class AuthService:
    def __init__(self, db: Session) -> None:
        self.users = UserRepository(db)
        self.refresh_tokens = RefreshTokenRepository(db)

    def register(self, email: str, display_name: str, password: str) -> User:
        if self.users.get_by_email(email) is not None:
            raise AppError(
                code="DUPLICATE_EMAIL",
                message="このメールアドレスは既に登録されています",
                status_code=409,
            )
        return self.users.create(email=email, display_name=display_name, password_hash=hash_password(password))

    def login(self, email: str, password: str) -> TokenPair:
        user = self.users.get_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            raise AppError(
                code="INVALID_CREDENTIALS",
                message="メールアドレスまたはパスワードが正しくありません",
                status_code=422,
            )
        return self._issue_tokens(user)

    def refresh(self, refresh_token: str) -> TokenPair:
        token_hash = hash_refresh_token(refresh_token)
        stored = self.refresh_tokens.get_valid_by_hash(token_hash)
        if stored is None:
            raise AppError(code="UNAUTHORIZED", message="認証が必要です", status_code=401)
        user = self.users.get_by_id(stored.user_id)
        if user is None:
            raise AppError(code="UNAUTHORIZED", message="認証が必要です", status_code=401)
        self.refresh_tokens.delete_by_hash(token_hash)
        return self._issue_tokens(user)

    def logout(self, refresh_token: str) -> None:
        self.refresh_tokens.delete_by_hash(hash_refresh_token(refresh_token))

    def _issue_tokens(self, user: User) -> TokenPair:
        access_token, expires_in = create_access_token(user.id)
        refresh_token = generate_refresh_token()
        self.refresh_tokens.create(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=refresh_token_expires_at(),
        )
        return TokenPair(
            access_token=access_token,
            expires_in=expires_in,
            refresh_token=refresh_token,
        )
