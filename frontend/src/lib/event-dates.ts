import type { EventListItem } from "./events";

export type ViewMode = "calendar" | "schedule";

export type ScheduleRange = {
  from: string;
  to: string;
  days: Date[];
};

export type DayEventClip = {
  event: EventListItem;
  clipStart: Date;
  clipEnd: Date;
};

const pad = (value: number) => String(value).padStart(2, "0");

export function dateOnlyStr(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getViewMode(params: URLSearchParams): ViewMode {
  return params.get("view") === "schedule" ? "schedule" : "calendar";
}

export function getCalendarMonth(params: URLSearchParams): { year: number; month: number } {
  const raw = params.get("month");
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split("-").map(Number);
    return { year, month: month - 1 };
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month + 1)}`;
}

export function getScheduleRange(params: URLSearchParams): ScheduleRange {
  const today = dateOnlyStr(new Date());
  let from = params.get("from") || today;
  let to = params.get("to") || from;
  if (to < from) to = from;

  const start = parseDateOnly(from);
  const maxEnd = new Date(start);
  maxEnd.setDate(maxEnd.getDate() + 6);
  const maxStr = dateOnlyStr(maxEnd);
  if (to > maxStr) to = maxStr;

  const days: Date[] = [];
  const cursor = parseDateOnly(from);
  const end = parseDateOnly(to);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return { from, to, days };
}

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function groupEventsByLocalDay(events: EventListItem[]): Record<string, EventListItem[]> {
  const grouped: Record<string, EventListItem[]> = {};
  for (const event of events) {
    const key = localDayKey(new Date(event.starts_at));
    grouped[key] ??= [];
    grouped[key].push(event);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  return grouped;
}

export function eventsOnDay(events: EventListItem[], dayDate: Date): DayEventClip[] {
  const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return events
    .filter((event) => {
      const starts = new Date(event.starts_at);
      const ends = new Date(event.ends_at);
      return starts < dayEnd && ends > dayStart;
    })
    .map((event) => {
      const starts = new Date(event.starts_at);
      const ends = new Date(event.ends_at);
      return {
        event,
        clipStart: new Date(Math.max(starts.getTime(), dayStart.getTime())),
        clipEnd: new Date(Math.min(ends.getTime(), dayEnd.getTime())),
      };
    })
    .sort((a, b) => a.clipStart.getTime() - b.clipStart.getTime());
}

export function buildListQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function formatEventTime(value: string): string {
  return new Date(value).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const HOUR_PX = 48;
