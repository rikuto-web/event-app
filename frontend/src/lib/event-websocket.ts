import { onCleanup } from "solid-js";
import { getAccessToken } from "./auth";

export type EventWsMessage =
  | {
      type: "event.updated";
      payload: {
        id: string;
        title: string;
        description?: string | null;
        starts_at?: string;
        ends_at?: string;
        location?: string | null;
        updated_at?: string | null;
        image_url?: string | null;
      };
    }
  | {
      type: "comment.created";
      payload: {
        id: string;
        body: string;
        author: { id: string; display_name: string };
        created_at: string;
      };
    }
  | {
      type: "participation.updated";
      payload: {
        user_id: string;
        display_name: string;
        status: "going" | "maybe" | "not_going";
      };
    };

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? "ws://127.0.0.1:8080";

export type EventWebSocketOptions = {
  eventId: string;
  onMessage: (message: EventWsMessage) => void;
  onConnectionChange?: (connected: boolean) => void;
};

export function connectEventWebSocket(options: EventWebSocketOptions): () => void {
  let ws: WebSocket | null = null;
  let disposed = false;
  let retryAttempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const connect = () => {
    if (disposed) return;
    const token = getAccessToken();
    if (!token) return;

    ws = new WebSocket(`${WS_BASE_URL}/ws/events/${options.eventId}?token=${encodeURIComponent(token)}`);

    ws.onopen = () => {
      retryAttempt = 0;
      options.onConnectionChange?.(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as EventWsMessage;
        options.onMessage(message);
      } catch {
        // Ignore malformed messages.
      }
    };

    ws.onclose = () => {
      options.onConnectionChange?.(false);
      ws = null;
      if (disposed) return;
      const delay = Math.min(1000 * 2 ** retryAttempt, 30000);
      retryAttempt += 1;
      retryTimer = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws?.close();
    };
  };

  connect();

  onCleanup(() => {
    disposed = true;
    if (retryTimer) clearTimeout(retryTimer);
    ws?.close();
  });

  return () => {
    disposed = true;
    if (retryTimer) clearTimeout(retryTimer);
    ws?.close();
  };
}
