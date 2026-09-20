import { fetchJson } from "./api";

export type ParticipationSummary = {
  going: number;
  maybe: number;
  not_going: number;
};

export type EventListItem = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  my_role: "owner" | "editor" | "viewer";
  participation_summary: ParticipationSummary;
};

export type EventListResponse = {
  items: EventListItem[];
  total: number;
};

export type EventListParams = {
  role?: string;
  from?: string;
  to?: string;
  sort?: string;
};

export type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  my_role: "owner" | "editor" | "viewer";
  participation_summary: ParticipationSummary;
};

export type EventMemberUser = {
  id: string;
  email: string;
  display_name: string;
};

export type EventMemberItem = {
  user_id: string;
  role: "owner" | "editor" | "viewer";
  user: EventMemberUser;
};

export type EventMembersResponse = {
  items: EventMemberItem[];
  total: number;
};

export type EventCommentAuthor = {
  id: string;
  display_name: string;
};

export type EventCommentItem = {
  id: string;
  body: string;
  author: EventCommentAuthor;
  created_at: string;
};

export type EventCommentsResponse = {
  items: EventCommentItem[];
  total: number;
};

export type CreateEventPayload = {
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  location?: string;
};

export type UpdateEventPayload = CreateEventPayload;

export async function fetchEvents(params: EventListParams = {}): Promise<EventListResponse> {
  const search = new URLSearchParams();
  if (params.role) search.set("role", params.role);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.sort) search.set("sort", params.sort);

  const query = search.toString();
  return fetchJson<EventListResponse>(`/events${query ? `?${query}` : ""}`);
}

export async function createEvent(payload: CreateEventPayload): Promise<EventDetail> {
  return fetchJson<EventDetail>("/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchEventDetail(eventId: string): Promise<EventDetail> {
  return fetchJson<EventDetail>(`/events/${eventId}`);
}

export async function deleteEvent(eventId: string): Promise<void> {
  return fetchJson<void>(`/events/${eventId}`, { method: "DELETE" });
}

export async function updateEvent(eventId: string, payload: UpdateEventPayload): Promise<EventDetail> {
  return fetchJson<EventDetail>(`/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function fetchEventMembers(eventId: string): Promise<EventMembersResponse> {
  return fetchJson<EventMembersResponse>(`/events/${eventId}/members`);
}

export async function fetchEventComments(eventId: string): Promise<EventCommentsResponse> {
  return fetchJson<EventCommentsResponse>(`/events/${eventId}/comments`);
}

export async function createEventComment(eventId: string, body: string): Promise<EventCommentItem> {
  return fetchJson<EventCommentItem>(`/events/${eventId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function updateEventComment(
  eventId: string,
  commentId: string,
  body: string,
): Promise<EventCommentItem> {
  return fetchJson<EventCommentItem>(`/events/${eventId}/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
}

export async function deleteEventComment(eventId: string, commentId: string): Promise<void> {
  return fetchJson<void>(`/events/${eventId}/comments/${commentId}`, { method: "DELETE" });
}

export function canEditEvent(role: EventDetail["my_role"]): boolean {
  return role === "owner" || role === "editor";
}

export function canDeleteEvent(role: EventDetail["my_role"]): boolean {
  return role === "owner";
}

export function canInviteMembers(role: EventDetail["my_role"]): boolean {
  return role === "owner";
}

export function canManageMember(role: EventDetail["my_role"]): boolean {
  return role === "owner";
}

export async function inviteEventMember(
  eventId: string,
  payload: { email: string; role: "editor" | "viewer" },
): Promise<EventMemberItem> {
  return fetchJson<EventMemberItem>(`/events/${eventId}/members`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEventMemberRole(
  eventId: string,
  userId: string,
  role: "editor" | "viewer",
): Promise<EventMemberItem> {
  return fetchJson<EventMemberItem>(`/events/${eventId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeEventMember(eventId: string, userId: string): Promise<void> {
  return fetchJson<void>(`/events/${eventId}/members/${userId}`, { method: "DELETE" });
}
