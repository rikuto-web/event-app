import { fireEvent, render, screen } from "@solidjs/testing-library";
import { Route, Router } from "@solidjs/router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, loadSession, setTokens } from "../lib/auth";
import { EventsPage } from "./EventsPage";

const sampleEvents = {
  items: [
    {
      id: "e1",
      title: "SolidJS 勉強会",
      starts_at: "2026-09-10T01:00:00Z",
      ends_at: "2026-09-10T03:00:00Z",
      location: "オンライン",
      my_role: "owner",
      participation_summary: { going: 2, maybe: 1, not_going: 0 },
    },
  ],
  total: 1,
};

describe("EventsPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearSession();
    vi.restoreAllMocks();
    setTokens({
      access_token: "access-token",
      token_type: "bearer",
      expires_in: 900,
      refresh_token: "refresh-token",
    });
    loadSession();
  });

  it("renders calendar view and event chip", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(sampleEvents), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    window.history.pushState({}, "", "/events?month=2026-09");
    render(() => (
      <Router>
        <Route path="/events" component={EventsPage} />
      </Router>
    ));

    expect(await screen.findByRole("button", { name: "カレンダー" })).toBeInTheDocument();
    expect(await screen.findByText(/SolidJS 勉強会/)).toBeInTheDocument();
  });

  it("requests events with role filter", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(sampleEvents), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    window.history.pushState({}, "", "/events?month=2026-09");
    render(() => (
      <Router>
        <Route path="/events" component={EventsPage} />
      </Router>
    ));

    await screen.findByRole("group", { name: "ロールフィルタ" });
    fireEvent.click(screen.getByRole("button", { name: "Owner" }));

    await vi.waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) => String(input).includes("role=owner")),
      ).toBe(true);
    });
  });
});
