from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.event import EventListResponse
from app.services.event_service import EventService

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=EventListResponse)
def list_events(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    role: Annotated[str | None, Query(pattern="^(owner|member)$")] = None,
    from_date: Annotated[date | None, Query(alias="from")] = None,
    to_date: Annotated[date | None, Query(alias="to")] = None,
    sort: Annotated[str, Query(pattern="^(starts_at_asc|starts_at_desc|updated_desc)$")] = "starts_at_asc",
) -> EventListResponse:
    return EventService(db).list_events(
        current_user.id,
        role=role,
        from_date=from_date,
        to_date=to_date,
        sort=sort,
    )
