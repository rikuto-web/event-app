import { fireEvent, render, screen } from "@solidjs/testing-library";
import { Route, Router } from "@solidjs/router";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("shows API error message on invalid credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "メールアドレスまたはパスワードが正しくありません",
            details: [],
          },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    window.history.pushState({}, "", "/login");
    render(() => (
      <Router>
        <Route path="/login" component={LoginPage} />
      </Router>
    ));

    fireEvent.input(screen.getByLabelText("メールアドレス"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.input(screen.getByLabelText("パスワード"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(
      await screen.findByText("メールアドレスまたはパスワードが正しくありません"),
    ).toBeInTheDocument();
  });
});
