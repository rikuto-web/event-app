import { For, onMount, Show, type Component } from "solid-js";
import { A } from "@solidjs/router";
import type { EventListItem } from "../../lib/events";
import {
  dateOnlyStr,
  eventsOnDay,
  formatEventTime,
  getScheduleRange,
  HOUR_PX,
  parseDateOnly,
} from "../../lib/event-dates";
import { EventsCard, EventsCardMeta } from "./EventsCard";

type ScheduleViewProps = {
  events: EventListItem[];
  searchParams: URLSearchParams;
  onNavigate: (query: Record<string, string | undefined>) => void;
};

export const ScheduleView: Component<ScheduleViewProps> = (props) => {
  let scrollRef: HTMLDivElement | undefined;

  const range = () => getScheduleRange(props.searchParams);
  const todayStr = dateOnlyStr(new Date());
  const dayCount = () => range().days.length;

  onMount(() => {
    const current = range();
    if (scrollRef && current.from <= todayStr && todayStr <= current.to) {
      const now = new Date();
      scrollRef.scrollTop = Math.max(0, (now.getHours() - 2) * HOUR_PX);
    }
  });

  const shiftDays = (delta: number) => {
    const current = range();
    const span = current.days.length;
    const start = parseDateOnly(current.from);
    start.setDate(start.getDate() + delta * span);
    const end = new Date(start);
    end.setDate(end.getDate() + span - 1);
    props.onNavigate({
      view: "schedule",
      role: props.searchParams.get("role") ?? undefined,
      from: dateOnlyStr(start),
      to: dateOnlyStr(end),
    });
  };

  const rangeLabel = () => {
    const current = range();
    if (current.from === current.to) {
      return parseDateOnly(current.from).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      });
    }
    return `${parseDateOnly(current.from).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    })} 〜 ${parseDateOnly(current.to).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    })}`;
  };

  const nowLineTop = () => {
    const now = new Date();
    return ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_PX;
  };

  return (
    <EventsCard
      scrollable
      bodyRef={(element) => {
        scrollRef = element;
      }}
      title={
        <>
          {rangeLabel()}
          <EventsCardMeta>
            （{dayCount()}日 · 24h）
          </EventsCardMeta>
        </>
      }
      actions={
        <>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            onClick={() => {
              const today = dateOnlyStr(new Date());
              props.onNavigate({
                view: "schedule",
                role: props.searchParams.get("role") ?? undefined,
                from: today,
                to: today,
              });
            }}
          >
            今日
          </button>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" aria-label="前へ" onClick={() => shiftDays(-1)}>
            ←
          </button>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" aria-label="次へ" onClick={() => shiftDays(1)}>
            →
          </button>
        </>
      }
    >
      <div
        class={`schedule-grid${dayCount() > 1 ? " multi-day" : ""}`}
        style={{
          "grid-template-columns": `52px repeat(${dayCount()}, minmax(140px, 1fr))`,
          "--day-count": String(dayCount()),
          "--hour-height": `${HOUR_PX}px`,
        }}
      >
        <div class="schedule-time-col">
          <Show when={dayCount() > 1}>
            <div class="schedule-time-corner" aria-hidden="true" />
          </Show>
          <For each={Array.from({ length: 24 }, (_, hour) => hour)}>
            {(hour) => (
              <div class="schedule-hour-label" style={{ height: `${HOUR_PX}px` }}>
                {String(hour).padStart(2, "0")}:00
              </div>
            )}
          </For>
        </div>
        <For each={range().days}>
          {(day) => {
            const dayStr = dateOnlyStr(day);
            const isToday = dayStr === todayStr;
            const dayEvents = () => eventsOnDay(props.events, day);

            return (
              <div class="schedule-day-col">
                <Show when={dayCount() > 1}>
                  <div class={`schedule-day-header${isToday ? " today" : ""}`}>
                    {day.toLocaleDateString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </div>
                </Show>
                <div class="schedule-day-body" style={{ height: `${HOUR_PX * 24}px` }}>
                  <Show when={isToday}>
                    <div class="schedule-now-line" style={{ top: `${nowLineTop()}px` }} />
                  </Show>
                  <For each={dayEvents()}>
                    {({ event, clipStart, clipEnd }) => {
                      const topMin = clipStart.getHours() * 60 + clipStart.getMinutes();
                      const durMin = Math.max(15, (clipEnd.getTime() - clipStart.getTime()) / 60000);
                      const top = (topMin / 60) * HOUR_PX;
                      const height = Math.max(22, (durMin / 60) * HOUR_PX);
                      return (
                        <A
                          href={`/events/${event.id}`}
                          class={`schedule-event role-${event.my_role}`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          title={event.title}
                        >
                          <span class="schedule-event-time">
                            {formatEventTime(clipStart.toISOString())}–{formatEventTime(clipEnd.toISOString())}
                          </span>
                          {event.title}
                        </A>
                      );
                    }}
                  </For>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </EventsCard>
  );
};
