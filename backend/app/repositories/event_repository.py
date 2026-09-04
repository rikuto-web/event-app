from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlalchemy import Select, and_, case, func, select
from sqlalchemy.orm import Session

from app.models import Event, EventMember, EventParticipation


@dataclass(frozen=True)
class EventListRow:
    event: Event
    my_role: str
    going: int
    maybe: int
    not_going: int


class EventRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_user(
        self,
        user_id: UUID,
        *,
        role: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        sort: str = "starts_at_asc",
    ) -> list[EventListRow]:
        participation_subq = (
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
