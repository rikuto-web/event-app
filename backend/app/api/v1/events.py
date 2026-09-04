from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.event import EventCreateRequest, EventDetailResponse, EventListResponse
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


@router.post("", response_model=EventDetailResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventDetailResponse:
    return EventService(db).create_event(current_user.id, payload)
