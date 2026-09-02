import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJson, setUnauthorizedHandler } from "./api";

describe("fetchJson", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setUnauthorizedHandler(() => {});
  });

  it("calls unauthorized handler on 401", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 401 }),
    );

    await expect(fetchJson("/events")).rejects.toThrow("Unauthorized");
    expect(handler).toHaveBeenCalledOnce();
  });
});
