from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.repositories.event_repository import EventRepository
from app.repositories.user_repository import UserRepository
from app.schemas.event import (
    EventCommentAuthor,
    EventCommentCreateRequest,
    EventCommentItem,
    EventCommentsResponse,
    EventCommentUpdateRequest,
    EventCreateRequest,
    EventDetailResponse,
    EventListItem,
    EventListResponse,
    EventMemberInviteRequest,
    EventMemberItem,
    EventMemberRoleUpdateRequest,
    EventMemberUser,
    EventMembersResponse,
    EventUpdateRequest,
    ParticipationSummary,
)
from app.ws.manager import ws_manager


class EventService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.events = EventRepository(db)
        self.users = UserRepository(db)

    def _event_not_found(self) -> AppError:
        return AppError(code="NOT_FOUND", message="イベントが見つかりません", status_code=404)

    def _forbidden(self) -> AppError:
        return AppError(code="FORBIDDEN", message="権限がありません", status_code=403)

    def _require_owner(self, user_id: UUID, event_id: UUID) -> None:
        role = self.events.get_member_role(user_id, event_id)
        if role is None:
            raise self._event_not_found()
        if role != "owner":
            raise self._forbidden()

    def _require_editor(self, user_id: UUID, event_id: UUID) -> str:
        role = self.events.get_member_role(user_id, event_id)
        if role is None:
            raise self._event_not_found()
        if role not in ("owner", "editor"):
            raise self._forbidden()
        return role

    async def _broadcast(self, event_id: UUID, message_type: str, payload: dict) -> None:
        await ws_manager.broadcast(event_id, {"type": message_type, "payload": payload})

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
            updated_at=event.updated_at,
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
            updated_at=row.event.updated_at,
        )

    async def update_event(self, user_id: UUID, event_id: UUID, data: EventUpdateRequest) -> EventDetailResponse:
        self._require_editor(user_id, event_id)
        updated = self.events.update_event(
            event_id,
            title=data.title,
            description=data.description,
            starts_at=data.starts_at,
            ends_at=data.ends_at,
            location=data.location,
        )
        if updated is None:
            raise self._event_not_found()

        detail = self.get_event(user_id, event_id)
        await self._broadcast(
            event_id,
            "event.updated",
            {
                "id": str(detail.id),
                "title": detail.title,
                "description": detail.description,
                "starts_at": detail.starts_at.isoformat(),
                "ends_at": detail.ends_at.isoformat(),
                "location": detail.location,
                "updated_at": detail.updated_at.isoformat() if detail.updated_at else None,
            },
        )
        return detail

    async def delete_event(self, user_id: UUID, event_id: UUID) -> None:
        self._require_owner(user_id, event_id)
        if not self.events.delete_event(event_id):
            raise self._event_not_found()

    async def invite_member(
        self, user_id: UUID, event_id: UUID, data: EventMemberInviteRequest
    ) -> EventMemberItem:
        self._require_owner(user_id, event_id)
        invitee = self.users.get_by_email(data.email)
        if invitee is None:
            raise AppError(code="CONFLICT", message="ユーザーが見つかりません", status_code=409)
        if self.events.member_exists(event_id, invitee.id):
            raise AppError(code="CONFLICT", message="既にメンバーです", status_code=409)

        self.events.add_member(event_id, invitee.id, data.role)
        return EventMemberItem(
            user_id=invitee.id,
            role=data.role,
            user=EventMemberUser(
                id=invitee.id,
                email=invitee.email,
                display_name=invitee.display_name,
            ),
        )

    async def update_member_role(
        self,
        user_id: UUID,
        event_id: UUID,
        target_user_id: UUID,
        data: EventMemberRoleUpdateRequest,
    ) -> EventMemberItem:
        self._require_owner(user_id, event_id)
        target_role = self.events.get_member_role(target_user_id, event_id)
        if target_role is None:
            raise self._event_not_found()
        if target_role == "owner":
            raise self._forbidden()

        if not self.events.update_member_role(event_id, target_user_id, data.role):
            raise self._event_not_found()

        target = self.users.get_by_id(target_user_id)
        assert target is not None
        return EventMemberItem(
            user_id=target.id,
            role=data.role,
            user=EventMemberUser(
                id=target.id,
                email=target.email,
                display_name=target.display_name,
            ),
        )

    async def remove_member(self, user_id: UUID, event_id: UUID, target_user_id: UUID) -> None:
        self._require_owner(user_id, event_id)
        target_role = self.events.get_member_role(target_user_id, event_id)
        if target_role is None:
            raise self._event_not_found()
        if target_role == "owner":
            raise self._forbidden()
        if not self.events.remove_member(event_id, target_user_id):
            raise self._event_not_found()

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

    async def create_comment(
        self, user_id: UUID, event_id: UUID, data: EventCommentCreateRequest
    ) -> EventCommentItem:
        if not self.events.is_member(user_id, event_id):
            raise self._event_not_found()

        comment = self.events.create_comment(event_id, user_id, data.body)
        author = self.users.get_by_id(user_id)
        assert author is not None
        item = EventCommentItem(
            id=comment.id,
            body=comment.body,
            author=EventCommentAuthor(id=author.id, display_name=author.display_name),
            created_at=comment.created_at,
        )
        await self._broadcast(
            event_id,
            "comment.created",
            {
                "id": str(item.id),
                "body": item.body,
                "author": {"id": str(item.author.id), "display_name": item.author.display_name},
                "created_at": item.created_at.isoformat(),
            },
        )
        return item

    async def update_comment(
        self,
        user_id: UUID,
        event_id: UUID,
        comment_id: UUID,
        data: EventCommentUpdateRequest,
    ) -> EventCommentItem:
        if not self.events.is_member(user_id, event_id):
            raise self._event_not_found()

        comment = self.events.get_comment(comment_id)
        if comment is None or comment.event_id != event_id:
            raise self._event_not_found()
        if comment.author_id != user_id:
            raise self._forbidden()

        updated = self.events.update_comment(comment_id, data.body)
        assert updated is not None
        author = self.users.get_by_id(user_id)
        assert author is not None
        return EventCommentItem(
            id=updated.id,
            body=updated.body,
            author=EventCommentAuthor(id=author.id, display_name=author.display_name),
            created_at=updated.created_at,
        )

    async def delete_comment(self, user_id: UUID, event_id: UUID, comment_id: UUID) -> None:
        if not self.events.is_member(user_id, event_id):
            raise self._event_not_found()

        comment = self.events.get_comment(comment_id)
        if comment is None or comment.event_id != event_id:
            raise self._event_not_found()
        if comment.author_id != user_id:
            raise self._forbidden()

        if not self.events.delete_comment(comment_id):
            raise self._event_not_found()
