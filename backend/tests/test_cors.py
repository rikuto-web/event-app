from fastapi.testclient import TestClient


def test_cors_allows_local_frontend(client: TestClient) -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_allows_loopback_ip_frontend(client: TestClient) -> None:
    response = client.options(
        "/api/v1/auth/register",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"
