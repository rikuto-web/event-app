import pytest
from fastapi.testclient import TestClient

from tests.conftest import _postgres_available

REGISTER_PAYLOAD = {
    "email": "alice@example.com",
    "display_name": "Alice",
    "password": "secret123",
}


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_register_creates_user_without_tokens(db_client: TestClient) -> None:
    response = db_client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == REGISTER_PAYLOAD["email"]
    assert body["display_name"] == REGISTER_PAYLOAD["display_name"]
    assert "id" in body
    assert "access_token" not in body
    assert "refresh_token" not in body


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_register_duplicate_email_returns_409(db_client: TestClient) -> None:
    db_client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = db_client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_EMAIL"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_register_validation_error_returns_422(db_client: TestClient) -> None:
    response = db_client.post(
        "/api/v1/auth/register",
        json={
            "email": "alice@example.com",
            "display_name": "Alice",
            "password": "short",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_login_returns_tokens(db_client: TestClient) -> None:
    db_client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = db_client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": REGISTER_PAYLOAD["password"]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 900
    assert body["access_token"]
    assert body["refresh_token"]


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_login_invalid_credentials_returns_422(db_client: TestClient) -> None:
    db_client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = db_client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": "wrong-password"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_refresh_returns_new_tokens(db_client: TestClient) -> None:
    db_client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    login_response = db_client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": REGISTER_PAYLOAD["password"]},
    )
    refresh_token = login_response.json()["refresh_token"]

    response = db_client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["refresh_token"] != refresh_token


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_refresh_invalid_token_returns_401(db_client: TestClient) -> None:
    response = db_client.post("/api/v1/auth/refresh", json={"refresh_token": "invalid-token"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_logout_revokes_refresh_token(db_client: TestClient) -> None:
    db_client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    login_response = db_client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": REGISTER_PAYLOAD["password"]},
    )
    tokens = login_response.json()

    logout_response = db_client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": tokens["refresh_token"]},
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    refresh_response = db_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )

    assert logout_response.status_code == 204
    assert refresh_response.status_code == 401


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_users_me_returns_profile(db_client: TestClient) -> None:
    register_response = db_client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    login_response = db_client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": REGISTER_PAYLOAD["password"]},
    )
    access_token = login_response.json()["access_token"]

    response = db_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == register_response.json()["id"]
    assert body["email"] == REGISTER_PAYLOAD["email"]
    assert body["display_name"] == REGISTER_PAYLOAD["display_name"]


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_users_me_unauthorized_without_token(db_client: TestClient) -> None:
    response = db_client.get("/api/v1/users/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"
