import os
from collections.abc import Generator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.core.security import hash_password
from app.db.session import get_db
from app.main import app
from app.models import Event, EventMember, EventParticipation, User

TEST_ALICE_EMAIL = "vs02-test-alice@example.com"
TEST_BOB_EMAIL = "vs02-test-bob@example.com"
TEST_USER_PASSWORD = "secret123"


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _postgres_available() -> bool:
    database_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5433/event_app",
    )
    try:
        engine = create_engine(database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except OperationalError:
        return False


@pytest.fixture
def database_url() -> str:
    return os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5433/event_app",
    )


@pytest.fixture
def db(database_url: str) -> Generator[Session, None, None]:
    engine = create_engine(database_url)
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection, autoflush=False, autocommit=False)()
    yield session
    session.close()
    transaction.rollback()
    connection.close()
    engine.dispose()


@pytest.fixture
def db_client(db: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _create_user(db: Session, *, email: str, display_name: str, password: str = "secret123") -> User:
    user = User(email=email, display_name=display_name, password_hash=hash_password(password))
    db.add(user)
    db.flush()
    return user


def _create_invited_event(
    db: Session,
    *,
    owner: User,
    invitee: User,
    title: str,
    starts_at: datetime,
    ends_at: datetime,
    invitee_role: str = "editor",
) -> Event:
    event = Event(
        owner_id=owner.id,
        title=title,
        starts_at=starts_at,
        ends_at=ends_at,
    )
    db.add(event)
    db.flush()
    db.add(EventMember(event_id=event.id, user_id=owner.id, role="owner"))
    db.add(EventMember(event_id=event.id, user_id=invitee.id, role=invitee_role))
    db.flush()
    return event


def _create_owned_event(
    db: Session,
    *,
    owner: User,
    title: str,
    starts_at: datetime,
    ends_at: datetime,
) -> Event:
    event = Event(
        owner_id=owner.id,
        title=title,
        starts_at=starts_at,
        ends_at=ends_at,
        location="オンライン",
    )
    db.add(event)
    db.flush()
    db.add(EventMember(event_id=event.id, user_id=owner.id, role="owner"))
    db.flush()
    return event


@pytest.fixture
def query_counter() -> Generator[dict[str, int], None, None]:
    counter = {"count": 0}

    def before_cursor_execute(
        _conn,
        _cursor,
        statement,
        _parameters,
        _context,
        _executemany,
    ) -> None:
        if statement.lstrip().upper().startswith("SELECT"):
            counter["count"] += 1

    event.listen(Engine, "before_cursor_execute", before_cursor_execute)
    yield counter
    event.remove(Engine, "before_cursor_execute", before_cursor_execute)


@pytest.fixture
def sample_events(db: Session) -> dict[str, object]:
    alice = _create_user(db, email=TEST_ALICE_EMAIL, display_name="Alice", password=TEST_USER_PASSWORD)
    bob = _create_user(db, email=TEST_BOB_EMAIL, display_name="Bob", password=TEST_USER_PASSWORD)

    owned = _create_owned_event(
        db,
        owner=alice,
        title="Owned Event",
        starts_at=datetime(2026, 9, 10, 10, 0, tzinfo=UTC),
        ends_at=datetime(2026, 9, 10, 12, 0, tzinfo=UTC),
    )
    invited = _create_invited_event(
        db,
        owner=bob,
        invitee=alice,
        title="Invited Event",
        starts_at=datetime(2026, 9, 15, 18, 0, tzinfo=UTC),
        ends_at=datetime(2026, 9, 15, 20, 0, tzinfo=UTC),
    )
    outside = _create_owned_event(
        db,
        owner=alice,
        title="Outside Range",
        starts_at=datetime(2026, 10, 1, 10, 0, tzinfo=UTC),
        ends_at=datetime(2026, 10, 1, 12, 0, tzinfo=UTC),
    )
    overlap = _create_owned_event(
        db,
        owner=alice,
        title="Overlap Event",
        starts_at=datetime(2026, 9, 9, 22, 0, tzinfo=UTC),
        ends_at=datetime(2026, 9, 10, 2, 0, tzinfo=UTC),
    )

    db.add(EventParticipation(event_id=owned.id, user_id=alice.id, status="going"))
    db.add(EventParticipation(event_id=owned.id, user_id=bob.id, status="maybe"))
    db.flush()

    return {
        "alice": alice,
        "bob": bob,
        "owned": owned,
        "invited": invited,
        "outside": outside,
        "overlap": overlap,
    }
