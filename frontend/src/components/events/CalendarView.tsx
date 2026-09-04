import { For, Show, type Component } from "solid-js";
import { A } from "@solidjs/router";
import type { EventListItem } from "../../lib/events";
import {
  formatEventTime,
  getCalendarMonth,
  groupEventsByLocalDay,
  localDayKey,
  monthKey,
  type ViewMode,
} from "../../lib/event-dates";
import { EventsCard } from "./EventsCard";

type CalendarViewProps = {
  events: EventListItem[];
  searchParams: URLSearchParams;
  onNavigate: (query: Record<string, string | undefined>) => void;
  onDayClick: (year: number, month: number, day: number, dayEvents: EventListItem[]) => void;
  onDayNumberClick: (year: number, month: number, day: number) => void;
  onDayMoreClick: (year: number, month: number, day: number, dayEvents: EventListItem[]) => void;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function weekendClass(year: number, month: number, day: number): string {
  const dayOfWeek = new Date(year, month, day).getDay();
  if (dayOfWeek === 0) return " sun";
  if (dayOfWeek === 6) return " sat";
  return "";
}

function weekdayClass(index: number): string {
  if (index === 0) return "calendar-weekday sun";
  if (index === 6) return "calendar-weekday sat";
  return "calendar-weekday";
}

export const CalendarView: Component<CalendarViewProps> = (props) => {
  const calendarMonth = () => getCalendarMonth(props.searchParams);
  const year = () => calendarMonth().year;
  const month = () => calendarMonth().month;
  const grouped = () => groupEventsByLocalDay(props.events);

  const first = () => new Date(year(), month(), 1);
  const startPad = () => first().getDay();
  const daysInMonth = () => new Date(year(), month() + 1, 0).getDate();
  const daysInPrev = () => new Date(year(), month(), 0).getDate();
  const todayKey = localDayKey(new Date());

  const cells = () => {
    const result: Array<{ day: number; year: number; month: number; other: boolean }> = [];
    for (let i = 0; i < startPad(); i += 1) {
      const day = daysInPrev() - startPad() + i + 1;
      const m = month() === 0 ? 11 : month() - 1;
      const y = month() === 0 ? year() - 1 : year();
      result.push({ day, year: y, month: m, other: true });
    }
    for (let day = 1; day <= daysInMonth(); day += 1) {
      result.push({ day, year: year(), month: month(), other: false });
    }
    while (result.length % 7 !== 0) {
      const nextDay = result.length - startPad() - daysInMonth() + 1;
      const m = month() === 11 ? 0 : month() + 1;
      const y = month() === 11 ? year() + 1 : year();
      result.push({ day: nextDay, year: y, month: m, other: true });
    }
    return result;
  };

  const goMonth = (delta: number) => {
    const next = new Date(year(), month() + delta, 1);
    props.onNavigate({
      view: "calendar",
      role: props.searchParams.get("role") ?? undefined,
      month: monthKey(next.getFullYear(), next.getMonth()),
    });
  };

  const monthLabel = () =>
    new Date(year(), month(), 1).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
    });

  return (
    <EventsCard
      title={monthLabel()}
      actions={
        <>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            onClick={() => {
              const now = new Date();
              props.onNavigate({
                view: "calendar",
                role: props.searchParams.get("role") ?? undefined,
                month: monthKey(now.getFullYear(), now.getMonth()),
              });
            }}
          >
            今月
          </button>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" aria-label="前月" onClick={() => goMonth(-1)}>
            ←
          </button>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" aria-label="翌月" onClick={() => goMonth(1)}>
            →
          </button>
        </>
      }
    >
      <div class="calendar-grid">
        <For each={WEEKDAYS}>
          {(weekday, index) => <div class={weekdayClass(index())}>{weekday}</div>}
        </For>
        <For each={cells()}>
          {(cell) => {
            const key = localDayKey(new Date(cell.year, cell.month, cell.day));
            const allDayEvents = () => grouped()[key] ?? [];
            const visibleEvents = () => allDayEvents().slice(0, 2);
            const overflow = () => allDayEvents().length - visibleEvents().length;
            const isToday = key === todayKey;

            return (
              <div
                class={`calendar-day${cell.other ? " other-month" : ""}${isToday ? " today" : ""}${weekendClass(cell.year, cell.month, cell.day)}`}
                onClick={() => props.onDayClick(cell.year, cell.month, cell.day, allDayEvents())}
              >
                <button
                  type="button"
                  class="calendar-day-num-btn"
                  aria-label={`${cell.day}日に作成`}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onDayNumberClick(cell.year, cell.month, cell.day);
                  }}
                >
                  {cell.day}
                </button>
                <For each={visibleEvents()}>
                  {(item) => (
                    <A
                      href={`/events/${item.id}`}
                      class={`calendar-event role-${item.my_role}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {formatEventTime(item.starts_at)} {item.title}
                    </A>
                  )}
                </For>
                <Show when={overflow() > 0}>
                  <button
                    type="button"
                    class="calendar-more-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onDayMoreClick(cell.year, cell.month, cell.day, allDayEvents());
                    }}
                  >
                    他 {overflow()} 件
                  </button>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </EventsCard>
  );
};

export type { ViewMode };
