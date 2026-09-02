import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders AppShell with logo on /events route", async () => {
    window.history.pushState({}, "", "/events");
    render(() => <App />);

    expect(await screen.findByText("イベント管理")).toBeInTheDocument();
  });
});
