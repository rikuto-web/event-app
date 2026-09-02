import subprocess
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect

from tests.conftest import _postgres_available

EXPECTED_TABLES = {
    "users",
    "events",
    "event_members",
    "event_comments",
    "event_participations",
    "refresh_tokens",
}


def test_initial_migration_defines_all_tables() -> None:
    migration_path = Path(__file__).resolve().parents[1] / "alembic/versions/0001_initial.py"
    content = migration_path.read_text(encoding="utf-8")

    for table in EXPECTED_TABLES:
        assert f'"{table}"' in content or f"'{table}'" in content


@pytest.mark.skipif(not _postgres_available(), reason="PostgreSQL is not available")
def test_alembic_upgrade_creates_all_tables(database_url: str) -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    env = {"DATABASE_URL": database_url}

    subprocess.run(
        ["alembic", "downgrade", "base"],
        cwd=backend_dir,
        check=False,
        env={**dict(**__import__("os").environ), **env},
    )
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        cwd=backend_dir,
        check=True,
        capture_output=True,
        text=True,
        env={**dict(**__import__("os").environ), **env},
    )
    assert result.returncode == 0

    engine = create_engine(database_url)
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    assert EXPECTED_TABLES.issubset(tables)
