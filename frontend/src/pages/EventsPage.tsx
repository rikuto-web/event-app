import { createResource, createSignal, Show, type Component } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { CalendarView } from "../components/events/CalendarView";
import { DayEventsModal } from "../components/events/DayEventsModal";
import { EventToolbar } from "../components/events/EventToolbar";
import { ScheduleView } from "../components/events/ScheduleView";
import { buildListQuery, getScheduleRange, getViewMode, monthKey } from "../lib/event-dates";
import { fetchEvents, type EventListItem } from "../lib/events";

type DayModalState = {
  year: number;
  month: number;
  day: number;
  events: EventListItem[];
};

export const EventsPage: Component = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [dayModal, setDayModal] = createSignal<DayModalState | null>(null);

  const queryKey = () => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string" && value) params.set(key, value);
      else if (Array.isArray(value)) {
        for (const item of value) {
          if (item) params.set(key, item);
        }
      }
    }
    return params.toString();
  };

  const parsedParams = () => new URLSearchParams(queryKey());
  const viewMode = () => getViewMode(parsedParams());

  const [events] = createResource(
    () => {
      const params = parsedParams();
      const role = params.get("role") ?? undefined;
      if (viewMode() === "schedule") {
        const range = getScheduleRange(params);
        return { role, from: range.from, to: range.to, view: "schedule" as const };
      }
      return { role, view: "calendar" as const };
    },
    (params) => fetchEvents(params),
  );

  const navigateWithQuery = (query: Record<string, string | undefined>) => {
    navigate(`/events${buildListQuery(query)}`);
  };

  const openCreateForDay = (year: number, month: number, day: number) => {
    const monthParam = monthKey(year, month);
    navigateWithQuery({
      view: "calendar",
      month: monthParam,
      create: "1",
      day: String(day),
    });
  };

  const handleDayClick = (year: number, month: number, day: number, dayEvents: EventListItem[]) => {
    if (dayEvents.length === 0) {
      openCreateForDay(year, month, day);
      return;
    }
    if (dayEvents.length === 1) {
      navigate(`/events/${dayEvents[0].id}`);
      return;
    }
    setDayModal({ year, month, day, events: dayEvents });
  };

  return (
    <section class="events-page">
      <h1 class="sr-only">イベント一覧</h1>

      <EventToolbar
        searchParams={parsedParams()}
        onNavigate={navigateWithQuery}
        onCreateClick={() => {
          const params = parsedParams();
          const query: Record<string, string | undefined> = {
            create: "1",
            role: params.get("role") ?? undefined,
          };
          if (viewMode() === "schedule") {
            const range = getScheduleRange(params);
            query.view = "schedule";
            query.from = range.from;
            query.to = range.to;
          } else {
            query.view = "calendar";
            query.month = params.get("month") ?? monthKey(new Date().getFullYear(), new Date().getMonth());
          }
          navigateWithQuery(query);
        }}
      />

      <div class="events-content">
      <Show when={!events.loading} fallback={<p class="events-loading">読み込み中...</p>}>
        <Show when={!events.error} fallback={<p class="events-error">イベントの取得に失敗しました。</p>}>
          <Show
            when={viewMode() === "schedule"}
            fallback={
              <CalendarView
                events={events()?.items ?? []}
                searchParams={parsedParams()}
                onNavigate={navigateWithQuery}
                onDayClick={handleDayClick}
                onDayNumberClick={openCreateForDay}
                onDayMoreClick={(year, month, day, dayEvents) => setDayModal({ year, month, day, events: dayEvents })}
              />
            }
          >
            <ScheduleView
              events={events()?.items ?? []}
              searchParams={parsedParams()}
              onNavigate={navigateWithQuery}
            />
          </Show>
        </Show>
      </Show>
      </div>

      <Show when={dayModal()}>
        {(modal) => (
          <DayEventsModal
            year={modal().year}
            month={modal().month}
            day={modal().day}
            events={modal().events}
            onClose={() => setDayModal(null)}
            onCreateForDay={() => {
              const current = modal();
              setDayModal(null);
              openCreateForDay(current.year, current.month, current.day);
            }}
          />
        )}
      </Show>
    </section>
  );
};
