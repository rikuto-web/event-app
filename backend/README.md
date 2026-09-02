# Backend

## Setup

```bash
cd backend
python3 -m pip install -e ".[dev]"
cp .env.example .env
```

PostgreSQL（例）:

```bash
docker run -d --name event-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=event_app \
  -p 5433:5432 postgres:16
```

## Migrate

```bash
alembic upgrade head
```

## Run

```bash
python3 -m granian --interface asgi app.main:app --host 0.0.0.0 --port 8080
```

## Test

```bash
python3 -m pytest
```

Migration integration test requires a running PostgreSQL instance (`DATABASE_URL`).
