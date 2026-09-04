"""seed demo data

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.db.seed_data import (
    DEMO_PASSWORD_HASH,
    EVENT_MEMBERS,
    EVENT_PARTICIPATIONS,
    EVENTS,
    SEED_EVENT_IDS,
    SEED_USER_IDS,
    USERS,
)

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    users_table = sa.table(
        "users",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("email", sa.String),
        sa.column("display_name", sa.String),
        sa.column("password_hash", sa.String),
    )
    op.bulk_insert(
        users_table,
        [
            {
                "id": user_id,
                "email": email,
                "display_name": display_name,
                "password_hash": DEMO_PASSWORD_HASH,
            }
            for user_id, email, display_name in USERS
        ],
    )

    events_table = sa.table(
        "events",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("owner_id", postgresql.UUID(as_uuid=True)),
        sa.column("title", sa.String),
        sa.column("description", sa.Text),
        sa.column("starts_at", sa.DateTime(timezone=True)),
        sa.column("ends_at", sa.DateTime(timezone=True)),
        sa.column("location", sa.String),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        events_table,
        [
            {
                "id": event_id,
                "owner_id": owner_id,
                "title": title,
                "description": description,
                "starts_at": starts_at,
                "ends_at": ends_at,
                "location": location,
                "updated_at": updated_at,
            }
            for event_id, owner_id, title, description, starts_at, ends_at, location, updated_at in EVENTS
        ],
    )

    members_table = sa.table(
        "event_members",
        sa.column("event_id", postgresql.UUID(as_uuid=True)),
        sa.column("user_id", postgresql.UUID(as_uuid=True)),
        sa.column("role", sa.String),
    )
    op.bulk_insert(
        members_table,
        [{"event_id": event_id, "user_id": user_id, "role": role} for event_id, user_id, role in EVENT_MEMBERS],
    )

    participations_table = sa.table(
        "event_participations",
        sa.column("event_id", postgresql.UUID(as_uuid=True)),
        sa.column("user_id", postgresql.UUID(as_uuid=True)),
        sa.column("status", sa.String),
    )
    op.bulk_insert(
        participations_table,
        [
            {"event_id": event_id, "user_id": user_id, "status": status}
            for event_id, user_id, status in EVENT_PARTICIPATIONS
        ],
    )


def downgrade() -> None:
    event_ids = ", ".join(f"'{event_id}'" for event_id in SEED_EVENT_IDS)
    user_ids = ", ".join(f"'{user_id}'" for user_id in SEED_USER_IDS)

    op.execute(f"DELETE FROM event_participations WHERE event_id IN ({event_ids})")
    op.execute(f"DELETE FROM event_members WHERE event_id IN ({event_ids})")
    op.execute(f"DELETE FROM events WHERE id IN ({event_ids})")
    op.execute(f"DELETE FROM users WHERE id IN ({user_ids})")
