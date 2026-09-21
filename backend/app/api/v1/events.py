from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.event import (
    EventCommentCreateRequest,
    EventCommentItem,
    EventCommentsResponse,
    EventCommentUpdateRequest,
    EventCreateRequest,
    EventDetailResponse,
    EventListResponse,
    EventParticipationUpdateRequest,
    EventMemberInviteRequest,
    EventMemberItem,
    EventMemberRoleUpdateRequest,
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


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    await EventService(db).delete_event(current_user.id, event_id)


@router.put("/{event_id}", response_model=EventDetailResponse)
async def update_event(
    event_id: UUID,
    payload: EventUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventDetailResponse:
    return await EventService(db).update_event(current_user.id, event_id, payload)


@router.post("/{event_id}/members", response_model=EventMemberItem, status_code=status.HTTP_201_CREATED)
async def invite_event_member(
    event_id: UUID,
    payload: EventMemberInviteRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventMemberItem:
    return await EventService(db).invite_member(current_user.id, event_id, payload)


@router.patch("/{event_id}/members/{user_id}", response_model=EventMemberItem)
async def update_event_member_role(
    event_id: UUID,
    user_id: UUID,
    payload: EventMemberRoleUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventMemberItem:
    return await EventService(db).update_member_role(current_user.id, event_id, user_id, payload)


@router.delete("/{event_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_event_member(
    event_id: UUID,
    user_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    await EventService(db).remove_member(current_user.id, event_id, user_id)


@router.get("/{event_id}/members", response_model=EventMembersResponse)
def list_event_members(
    event_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventMembersResponse:
    return EventService(db).list_members(current_user.id, event_id)


@router.post("/{event_id}/comments", response_model=EventCommentItem, status_code=status.HTTP_201_CREATED)
async def create_event_comment(
    event_id: UUID,
    payload: EventCommentCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventCommentItem:
    return await EventService(db).create_comment(current_user.id, event_id, payload)


@router.patch("/{event_id}/comments/{comment_id}", response_model=EventCommentItem)
async def update_event_comment(
    event_id: UUID,
    comment_id: UUID,
    payload: EventCommentUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventCommentItem:
    return await EventService(db).update_comment(current_user.id, event_id, comment_id, payload)


@router.delete("/{event_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event_comment(
    event_id: UUID,
    comment_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    await EventService(db).delete_comment(current_user.id, event_id, comment_id)


@router.put("/{event_id}/participation", response_model=EventDetailResponse)
async def update_event_participation(
    event_id: UUID,
    payload: EventParticipationUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> EventDetailResponse:
    return await EventService(db).update_participation(current_user.id, event_id, payload)


@router.get("/{event_id}/comments", response_model=EventCommentsResponse)
def list_event_comments(
    event_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> EventCommentsResponse:
    return EventService(db).list_comments(current_user.id, event_id, limit=limit)
