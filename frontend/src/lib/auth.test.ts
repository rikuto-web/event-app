import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSession,
  isAuthenticated,
  registerAndLogin,
  setTokens,
} from "./auth";

describe("auth", () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearSession();
    vi.restoreAllMocks();
  });

  it("tracks authentication state from stored access token", () => {
    expect(isAuthenticated()).toBe(false);

    setTokens({
      access_token: "access-token",
      token_type: "bearer",
      expires_in: 900,
      refresh_token: "refresh-token",
    });

    expect(isAuthenticated()).toBe(true);
    expect(sessionStorage.getItem("access_token")).toBe("access-token");
  });

  it("registerAndLogin calls register then login", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/register") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            id: "user-1",
            email: "alice@example.com",
            display_name: "Alice",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/auth/login") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            access_token: "access-token",
            token_type: "bearer",
            expires_in: 900,
            refresh_token: "refresh-token",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/users/me")) {
        return new Response(
          JSON.stringify({
            id: "user-1",
            email: "alice@example.com",
            display_name: "Alice",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const user = await registerAndLogin({
      email: "alice@example.com",
      display_name: "Alice",
      password: "secret123",
    });

    expect(user.display_name).toBe("Alice");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(isAuthenticated()).toBe(true);
  });
});
