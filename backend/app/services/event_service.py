from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.repositories.event_repository import EventRepository
from app.schemas.event import EventListItem, EventListResponse, ParticipationSummary


class EventService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.events = EventRepository(db)

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
