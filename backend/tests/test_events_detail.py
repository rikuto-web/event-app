import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_ALICE_EMAIL, TEST_BOB_EMAIL, TEST_USER_PASSWORD, _postgres_available
from tests.helpers import auth_headers, login


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_get_event_requires_auth(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]

    response = db_client.get(f"/api/v1/events/{owned.id}")

    assert response.status_code == 401


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_get_event_returns_detail_for_member(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get(f"/api/v1/events/{owned.id}", headers=auth_headers(token))

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Owned Event"
    assert body["location"] == "オンライン"
    assert body["my_role"] == "owner"
    assert body["participation_summary"] == {"going": 1, "maybe": 1, "not_going": 0}


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_get_event_returns_404_for_non_member(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_BOB_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get(f"/api/v1/events/{owned.id}", headers=auth_headers(token))

    assert response.status_code == 404


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_get_event_returns_404_for_unknown_id(db_client: TestClient, sample_events: dict) -> None:
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get(
        "/api/v1/events/00000000-0000-0000-0000-000000000099",
        headers=auth_headers(token),
    )

    assert response.status_code == 404


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_event_members_requires_auth(db_client: TestClient, sample_events: dict) -> None:
    invited = sample_events["invited"]

    response = db_client.get(f"/api/v1/events/{invited.id}/members")

    assert response.status_code == 401


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_event_members_returns_nested_users(db_client: TestClient, sample_events: dict) -> None:
    invited = sample_events["invited"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get(f"/api/v1/events/{invited.id}/members", headers=auth_headers(token))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    roles = {item["user"]["display_name"]: item["role"] for item in body["items"]}
    assert roles == {"Bob": "owner", "Alice": "editor"}
    assert all("email" in item["user"] for item in body["items"])


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_event_members_returns_404_for_non_member(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_BOB_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get(f"/api/v1/events/{owned.id}/members", headers=auth_headers(token))

    assert response.status_code == 404


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_event_members_avoids_n_plus_one(
    db_client: TestClient,
    sample_events: dict,
    query_counter: dict[str, int],
) -> None:
    invited = sample_events["invited"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    query_counter["count"] = 0
    response = db_client.get(f"/api/v1/events/{invited.id}/members", headers=auth_headers(token))

    assert response.status_code == 200
    assert query_counter["count"] <= 4


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_event_comments_requires_auth(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]

    response = db_client.get(f"/api/v1/events/{owned.id}/comments")

    assert response.status_code == 401


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_event_comments_returns_nested_authors(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get(f"/api/v1/events/{owned.id}/comments", headers=auth_headers(token))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["items"][0]["body"] == "See you there"
    assert body["items"][0]["author"]["display_name"] == "Alice"
    assert body["items"][1]["author"]["display_name"] == "Alice"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_event_comments_returns_404_for_non_member(db_client: TestClient, sample_events: dict) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_BOB_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get(f"/api/v1/events/{owned.id}/comments", headers=auth_headers(token))

    assert response.status_code == 404


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_event_comments_avoids_n_plus_one(
    db_client: TestClient,
    sample_events: dict,
    query_counter: dict[str, int],
) -> None:
    owned = sample_events["owned"]
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    query_counter["count"] = 0
    response = db_client.get(f"/api/v1/events/{owned.id}/comments", headers=auth_headers(token))

    assert response.status_code == 200
    assert query_counter["count"] <= 4
