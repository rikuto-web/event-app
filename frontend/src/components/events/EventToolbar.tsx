import { Show, type Component } from "solid-js";
import { getScheduleRange, getViewMode, monthKey } from "../../lib/event-dates";
import { DateInput } from "./DateInput";
import { RoleFilterToggle, type RoleFilterValue } from "./RoleFilterToggle";

type EventToolbarProps = {
  searchParams: URLSearchParams;
  onNavigate: (query: Record<string, string | undefined>) => void;
  onCreateClick: () => void;
};

export const EventToolbar: Component<EventToolbarProps> = (props) => {
  const view = () => getViewMode(props.searchParams);
  const scheduleRange = () => getScheduleRange(props.searchParams);

  const currentRole = (): RoleFilterValue => {
    const role = props.searchParams.get("role");
    return role === "owner" || role === "member" ? role : "";
  };

  const buildQuery = (patch: Record<string, string | undefined>) => {
    const query: Record<string, string | undefined> = {
      view: view(),
      role: props.searchParams.get("role") ?? undefined,
      ...patch,
    };

    if (view() === "schedule") {
      const range = scheduleRange();
      query.from ??= range.from;
      query.to ??= range.to;
      delete query.month;
    } else {
      query.month ??=
        props.searchParams.get("month") ?? monthKey(new Date().getFullYear(), new Date().getMonth());
      delete query.from;
      delete query.to;
    }

    return query;
  };

  const setView = (nextView: "calendar" | "schedule") => {
    const role = props.searchParams.get("role") ?? undefined;
    if (nextView === "schedule") {
      const today = scheduleRange().from;
      props.onNavigate({ view: "schedule", role, from: today, to: today });
      return;
    }

    const now = new Date();
    props.onNavigate({
      view: "calendar",
      role,
      month: props.searchParams.get("month") ?? monthKey(now.getFullYear(), now.getMonth()),
    });
  };

  return (
    <div class="toolbar">
      <div class="toolbar-leading">
        <div class="view-toggle" role="group" aria-label="表示切替">
          <button
            type="button"
            class={view() === "calendar" ? "active" : undefined}
            aria-pressed={view() === "calendar"}
            onClick={() => setView("calendar")}
          >
            カレンダー
          </button>
          <button
            type="button"
            class={view() === "schedule" ? "active" : undefined}
            aria-pressed={view() === "schedule"}
            onClick={() => setView("schedule")}
          >
            スケジュール
          </button>
        </div>

        <RoleFilterToggle
          value={currentRole()}
          onChange={(role) => props.onNavigate(buildQuery({ role: role || undefined }))}
        />

        <Show when={view() === "schedule"}>
          <div class="schedule-range-inputs">
            <DateInput
              label="開始日"
              value={scheduleRange().from}
              onChange={(from) => props.onNavigate(buildQuery({ from }))}
            />
            <span class="schedule-range-sep">〜</span>
            <DateInput
              label="終了日"
              value={scheduleRange().to}
              onChange={(to) => props.onNavigate(buildQuery({ to }))}
            />
          </div>
        </Show>
      </div>

      <button type="button" class="btn btn-primary btn-sm toolbar-create" onClick={props.onCreateClick}>
        + 新規作成
      </button>
    </div>
  );
};
