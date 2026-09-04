import { For, Show, type Component } from "solid-js";
import { A } from "@solidjs/router";
import type { EventListItem } from "../../lib/events";
import { formatEventTime } from "../../lib/event-dates";

type DayEventsModalProps = {
  year: number;
  month: number;
  day: number;
  events: EventListItem[];
  onClose: () => void;
  onCreateForDay: () => void;
};

export const DayEventsModal: Component<DayEventsModalProps> = (props) => {
  const label = new Date(props.year, props.month, props.day).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div class="modal-panel">
        <div style={{ display: "flex", "justify-content": "space-between", "align-items": "start", gap: "0.75rem" }}>
          <h2>{label}</h2>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-icon"
            aria-label="閉じる"
            onClick={props.onClose}
          >
            ×
          </button>
        </div>
        <div style={{ "margin-top": "1rem", display: "flex", "flex-direction": "column", gap: "0.5rem" }}>
          <For each={props.events}>
            {(event) => (
              <A href={`/events/${event.id}`} class="modal-event-link">
                <strong>{event.title}</strong>
                <time>
                  {formatEventTime(event.starts_at)} – {formatEventTime(event.ends_at)}
                </time>
              </A>
            )}
          </For>
          <Show when={props.events.length === 0}>
            <p style={{ margin: 0, color: "var(--muted)", "font-size": "0.9rem" }}>この日のイベントはありません。</p>
          </Show>
        </div>
        <div style={{ "margin-top": "1rem", display: "flex", "justify-content": "flex-end" }}>
          <button type="button" class="btn btn-primary btn-sm" onClick={props.onCreateForDay}>
            この日に作成
          </button>
        </div>
      </div>
    </div>
  );
};
