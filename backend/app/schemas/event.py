from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ParticipationSummary(BaseModel):
    going: int = 0
    maybe: int = 0
    not_going: int = 0


class EventListItem(BaseModel):
    id: UUID
    title: str
    starts_at: datetime
    ends_at: datetime
    location: str | None
    my_role: str
    participation_summary: ParticipationSummary


class EventListResponse(BaseModel):
    items: list[EventListItem]
    total: int


class EventListQuery(BaseModel):
    role: str | None = Field(default=None, pattern="^(owner|member)$")
    from_date: date | None = Field(default=None, alias="from")
    to_date: date | None = Field(default=None, alias="to")
    sort: str = Field(default="starts_at_asc", pattern="^(starts_at_asc|starts_at_desc|updated_desc)$")

    model_config = {"populate_by_name": True}
