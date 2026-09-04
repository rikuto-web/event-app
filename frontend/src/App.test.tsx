import { render, screen } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { clearSession, setTokens } from "./lib/auth";

describe("App", () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearSession();
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated users from /events to /login", async () => {
    window.history.pushState({}, "", "/events");
    render(() => <App />);

    expect(await screen.findByRole("heading", { name: "ログイン" })).toBeInTheDocument();
  });

  it("renders AppShell with user name when authenticated", async () => {
    setTokens({
      access_token: "access-token",
      token_type: "bearer",
      expires_in: 900,
      refresh_token: "refresh-token",
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/users/me")) {
        return new Response(
          JSON.stringify({
            id: "user-1",
            email: "alice@example.com",
            display_name: "Alice",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/events")) {
        return new Response(JSON.stringify({ items: [], total: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(null, { status: 404 });
    });

    window.history.pushState({}, "", "/events");
    render(() => <App />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "カレンダー" })).toBeInTheDocument();
  });

  it("redirects /events/new to create modal", async () => {
    setTokens({
      access_token: "access-token",
      token_type: "bearer",
      expires_in: 900,
      refresh_token: "refresh-token",
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/users/me")) {
        return new Response(
          JSON.stringify({
            id: "user-1",
            email: "alice@example.com",
            display_name: "Alice",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/events")) {
        return new Response(JSON.stringify({ items: [], total: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(null, { status: 404 });
    });

    window.history.pushState({}, "", "/events/new");
    render(() => <App />);

    expect(await screen.findByRole("heading", { name: "新規イベント" })).toBeInTheDocument();
  });
});
