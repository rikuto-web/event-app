from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.event import (
    EventCommentsResponse,
    EventCreateRequest,
    EventDetailResponse,
    EventListResponse,
    EventMembersResponse,
    EventUpdateRequest,
)
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


@router.get("/{event_id}", response_model=EventDetailResponse)
def get_event(
    event_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventDetailResponse:
    return EventService(db).get_event(current_user.id, event_id)


@router.put("/{event_id}", response_model=EventDetailResponse)
async def update_event(
    event_id: UUID,
    payload: EventUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventDetailResponse:
    return await EventService(db).update_event(current_user.id, event_id, payload)


@router.get("/{event_id}/members", response_model=EventMembersResponse)
def list_event_members(
    event_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventMembersResponse:
    return EventService(db).list_members(current_user.id, event_id)


@router.get("/{event_id}/comments", response_model=EventCommentsResponse)
def list_event_comments(
    event_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> EventCommentsResponse:
    return EventService(db).list_comments(current_user.id, event_id, limit=limit)
