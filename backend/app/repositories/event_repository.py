from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlalchemy import Select, and_, case, func, select
from sqlalchemy.orm import Session

from app.models import Event, EventComment, EventMember, EventParticipation, User


@dataclass(frozen=True)
class EventListRow:
    event: Event
    my_role: str
    going: int
    maybe: int
    not_going: int


@dataclass(frozen=True)
class EventDetailRow:
    event: Event
    my_role: str
    going: int
    maybe: int
    not_going: int


@dataclass(frozen=True)
class EventMemberRow:
    user_id: UUID
    role: str
    email: str
    display_name: str


@dataclass(frozen=True)
class EventCommentRow:
    id: UUID
    body: str
    author_id: UUID
    author_display_name: str
    created_at: datetime


class EventRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _participation_subquery(self):
        return (
            select(
                EventParticipation.event_id.label("event_id"),
                func.coalesce(
                    func.sum(case((EventParticipation.status == "going", 1), else_=0)),
                    0,
                ).label("going"),
                func.coalesce(
                    func.sum(case((EventParticipation.status == "maybe", 1), else_=0)),
                    0,
                ).label("maybe"),
                func.coalesce(
                    func.sum(case((EventParticipation.status == "not_going", 1), else_=0)),
                    0,
                ).label("not_going"),
            )
            .group_by(EventParticipation.event_id)
            .subquery()
        )

    def list_for_user(
        self,
        user_id: UUID,
        *,
        role: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        sort: str = "starts_at_asc",
    ) -> list[EventListRow]:
        participation_subq = self._participation_subquery()

        membership = (
            select(EventMember)
            .where(EventMember.user_id == user_id)
            .subquery()
        )

        stmt: Select = (
            select(
                Event,
                membership.c.role,
                func.coalesce(participation_subq.c.going, 0),
                func.coalesce(participation_subq.c.maybe, 0),
                func.coalesce(participation_subq.c.not_going, 0),
            )
            .join(membership, membership.c.event_id == Event.id)
            .outerjoin(participation_subq, participation_subq.c.event_id == Event.id)
        )

        if role == "owner":
            stmt = stmt.where(membership.c.role == "owner")
        elif role == "member":
            stmt = stmt.where(membership.c.role != "owner")

        if from_date is not None or to_date is not None:
            effective_from = from_date or to_date
            effective_to = to_date or from_date
            assert effective_from is not None
            assert effective_to is not None

            range_start = datetime.combine(effective_from, datetime.min.time(), tzinfo=UTC)
            range_end = datetime.combine(effective_to + timedelta(days=1), datetime.min.time(), tzinfo=UTC)
            stmt = stmt.where(
                and_(
                    Event.starts_at < range_end,
                    Event.ends_at > range_start,
                )
            )

        if sort == "starts_at_desc":
            stmt = stmt.order_by(Event.starts_at.desc())
        elif sort == "updated_desc":
            stmt = stmt.order_by(Event.updated_at.desc())
        else:
            stmt = stmt.order_by(Event.starts_at.asc())

        rows = self.db.execute(stmt).all()
        return [
            EventListRow(
                event=event,
                my_role=my_role,
                going=int(going),
                maybe=int(maybe),
                not_going=int(not_going),
            )
            for event, my_role, going, maybe, not_going in rows
        ]

    def create(
        self,
        owner_id: UUID,
        *,
        title: str,
        description: str | None,
        starts_at: datetime,
        ends_at: datetime,
        location: str | None,
    ) -> Event:
        event = Event(
            owner_id=owner_id,
            title=title,
            description=description,
            starts_at=starts_at,
            ends_at=ends_at,
            location=location,
        )
        self.db.add(event)
        self.db.flush()
        self.db.add(EventMember(event_id=event.id, user_id=owner_id, role="owner"))
        self.db.commit()
        self.db.refresh(event)
        return event

    def get_for_member(self, user_id: UUID, event_id: UUID) -> EventDetailRow | None:
        participation_subq = self._participation_subquery()
        membership = (
            select(EventMember)
            .where(EventMember.user_id == user_id, EventMember.event_id == event_id)
            .subquery()
        )

        stmt = (
            select(
                Event,
                membership.c.role,
                func.coalesce(participation_subq.c.going, 0),
                func.coalesce(participation_subq.c.maybe, 0),
                func.coalesce(participation_subq.c.not_going, 0),
            )
            .join(membership, membership.c.event_id == Event.id)
            .outerjoin(participation_subq, participation_subq.c.event_id == Event.id)
            .where(Event.id == event_id)
        )

        row = self.db.execute(stmt).one_or_none()
        if row is None:
            return None

        event, my_role, going, maybe, not_going = row
        return EventDetailRow(
            event=event,
            my_role=my_role,
            going=int(going),
            maybe=int(maybe),
            not_going=int(not_going),
        )

    def is_member(self, user_id: UUID, event_id: UUID) -> bool:
        stmt = select(EventMember.id).where(
            EventMember.user_id == user_id,
            EventMember.event_id == event_id,
        )
        return self.db.execute(stmt).scalar_one_or_none() is not None

    def list_members(self, event_id: UUID) -> list[EventMemberRow]:
        stmt = (
            select(
                EventMember.user_id,
                EventMember.role,
                User.email,
                User.display_name,
            )
            .join(User, User.id == EventMember.user_id)
            .where(EventMember.event_id == event_id)
            .order_by(EventMember.created_at.asc())
        )
        rows = self.db.execute(stmt).all()
        return [
            EventMemberRow(
                user_id=user_id,
                role=role,
                email=email,
                display_name=display_name,
            )
            for user_id, role, email, display_name in rows
        ]

    def list_comments(self, event_id: UUID, *, limit: int = 50) -> list[EventCommentRow]:
        stmt = (
            select(
                EventComment.id,
                EventComment.body,
                User.id,
                User.display_name,
                EventComment.created_at,
            )
            .join(User, User.id == EventComment.author_id)
            .where(EventComment.event_id == event_id)
            .order_by(EventComment.created_at.asc())
            .limit(limit)
        )
        rows = self.db.execute(stmt).all()
        return [
            EventCommentRow(
                id=comment_id,
                body=body,
                author_id=author_id,
                author_display_name=author_display_name,
                created_at=created_at,
            )
            for comment_id, body, author_id, author_display_name, created_at in rows
        ]

    def get_member_role(self, user_id: UUID, event_id: UUID) -> str | None:
        stmt = select(EventMember.role).where(
            EventMember.user_id == user_id,
            EventMember.event_id == event_id,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def update_event(
        self,
        event_id: UUID,
        *,
        title: str,
        description: str | None,
        starts_at: datetime,
        ends_at: datetime,
        location: str | None,
    ) -> Event | None:
        event = self.db.get(Event, event_id)
        if event is None:
            return None
        event.title = title
        event.description = description
        event.starts_at = starts_at
        event.ends_at = ends_at
        event.location = location
        self.db.commit()
        self.db.refresh(event)
        return event

    def delete_event(self, event_id: UUID) -> bool:
        event = self.db.get(Event, event_id)
        if event is None:
            return False
        self.db.delete(event)
        self.db.commit()
        return True

    def add_member(self, event_id: UUID, user_id: UUID, role: str) -> EventMember:
        member = EventMember(event_id=event_id, user_id=user_id, role=role)
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member

    def member_exists(self, event_id: UUID, user_id: UUID) -> bool:
        stmt = select(EventMember.id).where(
            EventMember.event_id == event_id,
            EventMember.user_id == user_id,
        )
        return self.db.execute(stmt).scalar_one_or_none() is not None

    def update_member_role(self, event_id: UUID, user_id: UUID, role: str) -> bool:
        stmt = select(EventMember).where(
            EventMember.event_id == event_id,
            EventMember.user_id == user_id,
        )
        member = self.db.execute(stmt).scalar_one_or_none()
        if member is None:
            return False
        member.role = role
        self.db.commit()
        return True

    def remove_member(self, event_id: UUID, user_id: UUID) -> bool:
        stmt = select(EventMember).where(
            EventMember.event_id == event_id,
            EventMember.user_id == user_id,
        )
        member = self.db.execute(stmt).scalar_one_or_none()
        if member is None:
            return False
        self.db.delete(member)
        self.db.commit()
        return True

    def create_comment(self, event_id: UUID, author_id: UUID, body: str) -> EventComment:
        comment = EventComment(event_id=event_id, author_id=author_id, body=body)
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def get_comment(self, comment_id: UUID) -> EventComment | None:
        return self.db.get(EventComment, comment_id)

    def update_comment(self, comment_id: UUID, body: str) -> EventComment | None:
        comment = self.db.get(EventComment, comment_id)
        if comment is None:
            return None
        comment.body = body
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def delete_comment(self, comment_id: UUID) -> bool:
        comment = self.db.get(EventComment, comment_id)
        if comment is None:
            return False
        self.db.delete(comment)
        self.db.commit()
        return True

    def get_participation_status(self, event_id: UUID, user_id: UUID) -> str | None:
        stmt = select(EventParticipation.status).where(
            EventParticipation.event_id == event_id,
            EventParticipation.user_id == user_id,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def upsert_participation(self, event_id: UUID, user_id: UUID, status: str) -> EventParticipation:
        stmt = select(EventParticipation).where(
            EventParticipation.event_id == event_id,
            EventParticipation.user_id == user_id,
        )
        participation = self.db.execute(stmt).scalar_one_or_none()
        if participation is None:
            participation = EventParticipation(event_id=event_id, user_id=user_id, status=status)
            self.db.add(participation)
        else:
            participation.status = status
        self.db.commit()
        self.db.refresh(participation)
        return participation
