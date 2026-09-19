import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_ALICE_EMAIL, TEST_BOB_EMAIL, TEST_USER_PASSWORD, _postgres_available
from tests.helpers import auth_headers, login


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_delete_event_as_owner(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.delete(f"/api/v1/events/{owned.id}", headers=auth_headers(token))

    assert response.status_code == 204
    get_response = db_client.get(f"/api/v1/events/{owned.id}", headers=auth_headers(token))
    assert get_response.status_code == 404


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_delete_event_forbidden_for_editor(db_client: TestClient, sample_events: dict) -> None:
    invited = sample_events["invited"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.delete(f"/api/v1/events/{invited.id}", headers=auth_headers(token))

    assert response.status_code == 403


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_delete_event_returns_404_for_non_member(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_BOB_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.delete(f"/api/v1/events/{owned.id}", headers=auth_headers(token))

    assert response.status_code == 404
