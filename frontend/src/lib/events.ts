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
};

export type CreateEventPayload = {
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  location?: string;
};

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
