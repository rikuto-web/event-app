import { type Component, type JSX } from "solid-js";

type EventsCardProps = {
  title: JSX.Element;
  actions: JSX.Element;
  scrollable?: boolean;
  bodyRef?: (element: HTMLDivElement) => void;
  children: JSX.Element;
};

export const EventsCard: Component<EventsCardProps> = (props) => {
  return (
    <div class="events-card">
      <div class="events-card-nav">
        <h2>{props.title}</h2>
        <div class="events-card-actions">{props.actions}</div>
      </div>
      <div
        ref={props.bodyRef}
        class={props.scrollable ? "events-card-body events-card-body--scroll" : "events-card-body"}
      >
        {props.children}
      </div>
    </div>
  );
};

type EventsCardMetaProps = {
  children: JSX.Element;
};

export const EventsCardMeta: Component<EventsCardMetaProps> = (props) => (
  <span class="events-card-meta">{props.children}</span>
);
