import { fireEvent, render, screen } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, loadSession, setTokens } from "../../lib/auth";
import { CreateEventModal } from "./CreateEventModal";

describe("CreateEventModal", () => {
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

  it("prefills datetime fields on open", () => {
    render(() => (
      <CreateEventModal onClose={() => undefined} onCreated={() => undefined} />
    ));

    expect((screen.getByLabelText("開始 *") as HTMLInputElement).value).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    );
    expect((screen.getByLabelText("終了 *") as HTMLInputElement).value).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    );
  });

  it("shows validation error when ends_at is before starts_at", async () => {
    render(() => (
      <CreateEventModal
        defaults={{ startsAt: "2026-09-10T12:00", endsAt: "2026-09-10T10:00" }}
        onClose={() => undefined}
        onCreated={() => undefined}
      />
    ));

    fireEvent.input(screen.getByLabelText(/タイトル/), { target: { value: "テストイベント" } });
    fireEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(await screen.findByText("終了日時は開始日時以降にしてください")).toBeInTheDocument();
  });

  it("navigates to detail after successful create", async () => {
    const onCreated = vi.fn();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "new-event-id",
          title: "テストイベント",
          description: null,
          starts_at: "2026-09-10T01:00:00.000Z",
          ends_at: "2026-09-10T03:00:00.000Z",
          location: null,
          my_role: "owner",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(() => (
      <CreateEventModal
        defaults={{ startsAt: "2026-09-10T10:00", endsAt: "2026-09-10T12:00" }}
        onClose={() => undefined}
        onCreated={onCreated}
      />
    ));

    fireEvent.input(screen.getByLabelText(/タイトル/), { target: { value: "テストイベント" } });
    fireEvent.click(screen.getByRole("button", { name: "作成" }));

    await vi.waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith("new-event-id");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/events"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("prevents double submit while creating", async () => {
    let resolveCreate: ((value: Response) => void) | undefined;
    const createPromise = new Promise<Response>((resolve) => {
      resolveCreate = resolve;
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).includes("/events") && init?.method === "POST") {
        return createPromise;
      }
      return new Response(null, { status: 404 });
    });

    render(() => (
      <CreateEventModal
        defaults={{ startsAt: "2026-09-10T10:00", endsAt: "2026-09-10T12:00" }}
        onClose={() => undefined}
        onCreated={() => undefined}
      />
    ));

    fireEvent.input(screen.getByLabelText(/タイトル/), { target: { value: "テストイベント" } });
    const submitButton = screen.getByRole("button", { name: "作成" });
    fireEvent.click(submitButton);

    expect(await screen.findByRole("button", { name: "作成中..." })).toBeDisabled();

    resolveCreate?.(
      new Response(
        JSON.stringify({
          id: "new-event-id",
          title: "テストイベント",
          description: null,
          starts_at: "2026-09-10T01:00:00.000Z",
          ends_at: "2026-09-10T03:00:00.000Z",
          location: null,
          my_role: "owner",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
  });
});
