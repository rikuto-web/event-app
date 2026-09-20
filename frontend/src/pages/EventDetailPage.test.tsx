import { render, screen } from "@solidjs/testing-library";
import { Route, Router } from "@solidjs/router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, loadSession, setTokens } from "../lib/auth";
import { EventDetailPage } from "./EventDetailPage";

const eventDetail = {
  id: "event-1",
  title: "SolidJS 勉強会",
  description: "ハンズオン",
  starts_at: "2026-09-10T01:00:00Z",
  ends_at: "2026-09-10T03:00:00Z",
  location: "オンライン",
  my_role: "owner" as const,
  participation_summary: { going: 2, maybe: 1, not_going: 0 },
};

const eventMembers = {
  items: [
    {
      user_id: "u1",
      role: "owner" as const,
      user: { id: "u1", email: "alice@example.com", display_name: "Alice" },
    },
    {
      user_id: "u2",
      role: "editor" as const,
      user: { id: "u2", email: "bob@example.com", display_name: "Bob" },
    },
  ],
  total: 2,
};

const eventComments = {
  items: [
    {
      id: "c1",
      body: "資料持参します",
      author: { id: "u2", display_name: "Bob" },
      created_at: "2026-09-09T08:00:00Z",
    },
  ],
  total: 1,
};

function mockDetailApis(role: "owner" | "editor" | "viewer" = "owner") {
  const detail = { ...eventDetail, my_role: role };
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/members")) {
      return new Response(JSON.stringify(eventMembers), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("/comments")) {
      return new Response(JSON.stringify(eventComments), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(detail), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(_url: string) {
    queueMicrotask(() => this.onopen?.());
  }
  close() {}
  send() {}
}

describe("EventDetailPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearSession();
    vi.restoreAllMocks();
    vi.stubGlobal("WebSocket", MockWebSocket);
    setTokens({
      access_token: "access-token",
      token_type: "bearer",
      expires_in: 900,
      refresh_token: "refresh-token",
    });
    loadSession();
  });

  it("renders event detail with members and comments", async () => {
    mockDetailApis("owner");
    window.history.pushState({}, "", "/events/event-1");

    render(() => (
      <Router>
        <Route path="/events/:eventId" component={EventDetailPage} />
      </Router>
    ));

    expect(await screen.findByRole("heading", { name: "SolidJS 勉強会" })).toBeInTheDocument();
    expect(screen.getByText("ハンズオン")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("資料持参します")).toBeInTheDocument();
    expect(screen.getByText(/参加 2 · 未定 1 · 不参加 0/)).toBeInTheDocument();
  });

  it("shows edit, delete, and invite for owner", async () => {
    mockDetailApis("owner");
    window.history.pushState({}, "", "/events/event-1");

    render(() => (
      <Router>
        <Route path="/events/:eventId" component={EventDetailPage} />
      </Router>
    ));

    expect(await screen.findByRole("link", { name: "編集" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ 招待" })).toBeInTheDocument();
  });

  it("shows edit only for editor", async () => {
    mockDetailApis("editor");
    window.history.pushState({}, "", "/events/event-1");

    render(() => (
      <Router>
        <Route path="/events/:eventId" component={EventDetailPage} />
      </Router>
    ));

    expect(await screen.findByRole("link", { name: "編集" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "削除" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ 招待" })).not.toBeInTheDocument();
  });

  it("hides action buttons for viewer", async () => {
    mockDetailApis("viewer");
    window.history.pushState({}, "", "/events/event-1");

    render(() => (
      <Router>
        <Route path="/events/:eventId" component={EventDetailPage} />
      </Router>
    ));

    await screen.findByRole("heading", { name: "SolidJS 勉強会" });
    expect(screen.queryByRole("link", { name: "編集" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "削除" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ 招待" })).not.toBeInTheDocument();
  });
});
