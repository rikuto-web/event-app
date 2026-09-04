import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_ALICE_EMAIL, TEST_USER_PASSWORD, _postgres_available
from tests.helpers import auth_headers, login


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_events_requires_auth(db_client: TestClient) -> None:
    response = db_client.get("/api/v1/events")
    assert response.status_code == 401


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_events_returns_only_member_events(db_client: TestClient, sample_events: dict) -> None:
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get("/api/v1/events", headers=auth_headers(token))

    assert response.status_code == 200
    body = response.json()
    titles = {item["title"] for item in body["items"]}
    assert titles == {"Owned Event", "Invited Event", "Outside Range", "Overlap Event"}
    assert body["total"] == 4


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_events_role_owner_filter(db_client: TestClient, sample_events: dict) -> None:
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get("/api/v1/events?role=owner", headers=auth_headers(token))

    assert response.status_code == 200
    titles = {item["title"] for item in response.json()["items"]}
    assert titles == {"Owned Event", "Outside Range", "Overlap Event"}


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_events_role_member_filter(db_client: TestClient, sample_events: dict) -> None:
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get("/api/v1/events?role=member", headers=auth_headers(token))

    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["title"] == "Invited Event"
    assert body["items"][0]["my_role"] == "editor"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_events_date_overlap_filter(db_client: TestClient, sample_events: dict) -> None:
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get(
        "/api/v1/events?from=2026-09-10&to=2026-09-10",
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    titles = {item["title"] for item in response.json()["items"]}
    assert titles == {"Owned Event", "Overlap Event"}


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_events_sort_starts_at_desc(db_client: TestClient, sample_events: dict) -> None:
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get("/api/v1/events?sort=starts_at_desc", headers=auth_headers(token))

    assert response.status_code == 200
    titles = [item["title"] for item in response.json()["items"]]
    assert titles[0] == "Outside Range"


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_events_includes_participation_summary(db_client: TestClient, sample_events: dict) -> None:
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    response = db_client.get("/api/v1/events?role=owner", headers=auth_headers(token))

    assert response.status_code == 200
    owned = next(item for item in response.json()["items"] if item["title"] == "Owned Event")
    assert owned["participation_summary"] == {"going": 1, "maybe": 1, "not_going": 0}


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_list_events_avoids_n_plus_one(
    db_client: TestClient,
    sample_events: dict,
    query_counter: dict[str, int],
) -> None:
    token = login(db_client, email=TEST_ALICE_EMAIL, password=TEST_USER_PASSWORD)

    query_counter["count"] = 0
    response = db_client.get("/api/v1/events", headers=auth_headers(token))

    assert response.status_code == 200
    assert query_counter["count"] <= 2
