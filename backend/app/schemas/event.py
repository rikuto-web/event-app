from datetime import date, datetime
from typing import Self
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


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


class EventCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str | None = None
    starts_at: datetime
    ends_at: datetime
    location: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def validate_datetime_range(self) -> Self:
        if self.ends_at < self.starts_at:
            raise ValueError("ends_at must be on or after starts_at")
        return self


class EventUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str | None = None
    starts_at: datetime
    ends_at: datetime
    location: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def validate_datetime_range(self) -> Self:
        if self.ends_at < self.starts_at:
            raise ValueError("ends_at must be on or after starts_at")
        return self


class EventDetailResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    starts_at: datetime
    ends_at: datetime
    location: str | None
    my_role: str
    participation_summary: ParticipationSummary
    updated_at: datetime | None = None


class EventMemberUser(BaseModel):
    id: UUID
    email: str
    display_name: str


class EventMemberItem(BaseModel):
    user_id: UUID
    role: str
    user: EventMemberUser


class EventMembersResponse(BaseModel):
    items: list[EventMemberItem]
    total: int


class EventCommentAuthor(BaseModel):
    id: UUID
    display_name: str


class EventCommentItem(BaseModel):
    id: UUID
    body: str
    author: EventCommentAuthor
    created_at: datetime


class EventCommentsResponse(BaseModel):
    items: list[EventCommentItem]
    total: int


class EventMemberInviteRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    role: str = Field(pattern="^(editor|viewer)$")


class EventMemberRoleUpdateRequest(BaseModel):
    role: str = Field(pattern="^(editor|viewer)$")
