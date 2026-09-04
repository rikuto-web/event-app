import { describe, expect, it } from "vitest";
import {
  dateOnlyStr,
  defaultRangeForDay,
  defaultRangeFromNow,
  fromLocalDatetimeInput,
  getScheduleRange,
  groupEventsByLocalDay,
  monthKey,
  parseDateOnly,
  resolveCreateDefaults,
  toLocalDatetimeInput,
} from "./event-dates";
import type { EventListItem } from "./events";

const sampleEvent = (startsAt: string, title: string): EventListItem => ({
  id: title,
  title,
  starts_at: startsAt,
  ends_at: startsAt,
  location: null,
  my_role: "owner",
  participation_summary: { going: 0, maybe: 0, not_going: 0 },
});

describe("event-dates", () => {
  it("builds month key", () => {
    expect(monthKey(2026, 8)).toBe("2026-09");
  });

  it("clamps schedule range to 7 days", () => {
    const params = new URLSearchParams("from=2026-09-01&to=2026-09-20");
    const range = getScheduleRange(params);
    expect(range.from).toBe("2026-09-01");
    expect(range.to).toBe("2026-09-07");
    expect(range.days).toHaveLength(7);
  });

  it("groups events by local day", () => {
    const grouped = groupEventsByLocalDay([
      sampleEvent("2026-09-10T01:00:00Z", "A"),
      sampleEvent("2026-09-10T04:00:00Z", "B"),
      sampleEvent("2026-09-11T01:00:00Z", "C"),
    ]);
    const dayKey = (() => {
      const date = parseDateOnly("2026-09-10");
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    })();
    expect(grouped[dayKey]?.map((event) => event.title)).toEqual(["A", "B"]);
  });

  it("formats date only string", () => {
    expect(dateOnlyStr(new Date(2026, 8, 4))).toBe("2026-09-04");
  });

  it("builds default range for day", () => {
    expect(defaultRangeForDay(2026, 8, 10)).toEqual({
      startsAt: "2026-09-10T10:00",
      endsAt: "2026-09-10T12:00",
    });
  });

  it("converts local datetime input to ISO", () => {
    const iso = fromLocalDatetimeInput("2026-09-10T10:00");
    expect(toLocalDatetimeInput(iso)).toBe("2026-09-10T10:00");
  });

  it("builds default range from now", () => {
    const now = new Date(2026, 8, 10, 15, 30);
    expect(defaultRangeFromNow(now)).toEqual({
      startsAt: "2026-09-10T15:30",
      endsAt: "2026-09-10T17:30",
    });
  });

  it("resolves create defaults with day range or now", () => {
    expect(
      resolveCreateDefaults({ startsAt: "2026-09-15T10:00", endsAt: "2026-09-15T12:00" }),
    ).toEqual({
      startsAt: "2026-09-15T10:00",
      endsAt: "2026-09-15T12:00",
    });

    const resolved = resolveCreateDefaults();
    expect(resolved.startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(resolved.endsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
