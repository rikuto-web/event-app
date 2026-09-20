import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_ALICE_EMAIL, TEST_BOB_EMAIL, TEST_USER_PASSWORD, _postgres_available
from tests.helpers import auth_headers, login


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_invite_member(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.post(
        f"/api/v1/events/{owned.id}/members",
        headers=auth_headers(token),
        json={"email": TEST_BOB_EMAIL, "role": "editor"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "editor"
    assert body["user"]["email"] == TEST_BOB_EMAIL


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_invite_member_conflict_when_already_member(db_client: TestClient, sample_events: dict) -> None:
    invited = sample_events["invited"]
    token = login(db_client, email=TEST_BOB_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.post(
        f"/api/v1/events/{invited.id}/members",
        headers=auth_headers(token),
        json={"email": TEST_ALICE_EMAIL, "role": "viewer"},
    )

    assert response.status_code == 409


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_invite_unknown_user(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.post(
        f"/api/v1/events/{owned.id}/members",
        headers=auth_headers(token),
        json={"email": "unknown@example.com", "role": "viewer"},
    )

    assert response.status_code == 409


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_update_member_role(db_client: TestClient, sample_events: dict) -> None:
    invited = sample_events["invited"]
    alice = sample_events["alice"]
    token = login(db_client, email=TEST_BOB_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.patch(
        f"/api/v1/events/{invited.id}/members/{alice.id}",
        headers=auth_headers(token),
        json={"role": "viewer"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "viewer"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_remove_member(db_client: TestClient, sample_events: dict) -> None:
    invited = sample_events["invited"]
    alice = sample_events["alice"]
    token = login(db_client, email=TEST_BOB_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.delete(
        f"/api/v1/events/{invited.id}/members/{alice.id}",
        headers=auth_headers(token),
    )

    assert response.status_code == 204
