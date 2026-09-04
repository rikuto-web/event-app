import { fireEvent, render, screen } from "@solidjs/testing-library";
import { Route, Router } from "@solidjs/router";
import { describe, expect, it, vi } from "vitest";
import { RegisterPage } from "./RegisterPage";

describe("RegisterPage", () => {
  it("shows duplicate email error on 409", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "DUPLICATE_EMAIL",
            message: "このメールアドレスは既に登録されています",
            details: [],
          },
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
    );

    window.history.pushState({}, "", "/register");
    render(() => (
      <Router>
        <Route path="/register" component={RegisterPage} />
      </Router>
    ));

    fireEvent.input(screen.getByLabelText("表示名"), { target: { value: "Alice" } });
    fireEvent.input(screen.getByLabelText("メールアドレス"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.input(screen.getByLabelText("パスワード（8文字以上）"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登録" }));

    expect(await screen.findByText("このメールアドレスは既に登録されています")).toBeInTheDocument();
  });

  it("shows email validation while typing", async () => {
    window.history.pushState({}, "", "/register");
    render(() => (
      <Router>
        <Route path="/register" component={RegisterPage} />
      </Router>
    ));

    fireEvent.input(screen.getByLabelText("メールアドレス"), {
      target: { value: "invalid-email" },
    });

    expect(await screen.findByText("形式が正しくありません")).toBeInTheDocument();
  });

  it("shows password validation while typing", async () => {
    window.history.pushState({}, "", "/register");
    render(() => (
      <Router>
        <Route path="/register" component={RegisterPage} />
      </Router>
    ));

    fireEvent.input(screen.getByLabelText("パスワード（8文字以上）"), {
      target: { value: "short" },
    });

    expect(await screen.findByText("8文字以上で入力")).toBeInTheDocument();
  });
});
