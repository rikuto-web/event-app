from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.repositories.event_repository import EventRepository
from app.schemas.event import (
    EventCommentAuthor,
    EventCommentItem,
    EventCommentsResponse,
    EventCreateRequest,
    EventDetailResponse,
    EventListItem,
    EventListResponse,
    EventMemberItem,
    EventMemberUser,
    EventMembersResponse,
    ParticipationSummary,
)


class EventService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.events = EventRepository(db)

    def _event_not_found(self) -> AppError:
        return AppError(code="NOT_FOUND", message="イベントが見つかりません", status_code=404)

    def list_events(
        self,
        user_id: UUID,
        *,
        role: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        sort: str = "starts_at_asc",
    ) -> EventListResponse:
        rows = self.events.list_for_user(
            user_id,
            role=role,
            from_date=from_date,
            to_date=to_date,
            sort=sort,
        )
        items = [
            EventListItem(
                id=row.event.id,
                title=row.event.title,
                starts_at=row.event.starts_at,
                ends_at=row.event.ends_at,
                location=row.event.location,
                my_role=row.my_role,
                participation_summary=ParticipationSummary(
                    going=row.going,
                    maybe=row.maybe,
                    not_going=row.not_going,
                ),
            )
            for row in rows
        ]
        return EventListResponse(items=items, total=len(items))

    def create_event(self, user_id: UUID, data: EventCreateRequest) -> EventDetailResponse:
        event = self.events.create(
            user_id,
            title=data.title,
            description=data.description,
            starts_at=data.starts_at,
            ends_at=data.ends_at,
            location=data.location,
        )
        return EventDetailResponse(
            id=event.id,
            title=event.title,
            description=event.description,
            starts_at=event.starts_at,
            ends_at=event.ends_at,
            location=event.location,
            my_role="owner",
            participation_summary=ParticipationSummary(),
        )

    def get_event(self, user_id: UUID, event_id: UUID) -> EventDetailResponse:
        row = self.events.get_for_member(user_id, event_id)
        if row is None:
            raise self._event_not_found()

        return EventDetailResponse(
            id=row.event.id,
            title=row.event.title,
            description=row.event.description,
            starts_at=row.event.starts_at,
            ends_at=row.event.ends_at,
            location=row.event.location,
            my_role=row.my_role,
            participation_summary=ParticipationSummary(
                going=row.going,
                maybe=row.maybe,
                not_going=row.not_going,
            ),
        )

    def list_members(self, user_id: UUID, event_id: UUID) -> EventMembersResponse:
        if not self.events.is_member(user_id, event_id):
            raise self._event_not_found()

        rows = self.events.list_members(event_id)
        items = [
            EventMemberItem(
                user_id=row.user_id,
                role=row.role,
                user=EventMemberUser(
                    id=row.user_id,
                    email=row.email,
                    display_name=row.display_name,
                ),
            )
            for row in rows
        ]
        return EventMembersResponse(items=items, total=len(items))

    def list_comments(self, user_id: UUID, event_id: UUID, *, limit: int = 50) -> EventCommentsResponse:
        if not self.events.is_member(user_id, event_id):
            raise self._event_not_found()

        rows = self.events.list_comments(event_id, limit=limit)
        items = [
            EventCommentItem(
                id=row.id,
                body=row.body,
                author=EventCommentAuthor(id=row.author_id, display_name=row.author_display_name),
                created_at=row.created_at,
            )
            for row in rows
        ]
        return EventCommentsResponse(items=items, total=len(items))
