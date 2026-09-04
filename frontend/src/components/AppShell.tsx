import { Show, type Component, type JSX } from "solid-js";
import { A } from "@solidjs/router";

type AppShellProps = {
  children: JSX.Element;
  isAuthenticated?: boolean;
  displayName?: string;
  onLogout?: () => void | Promise<void>;
};

export const AppShell: Component<AppShellProps> = (props) => {
  const handleLogout = () => {
    void props.onLogout?.();
  };

  return (
    <div class="min-h-screen bg-[#f5f6fa]">
      <Show when={props.isAuthenticated}>
        <header class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <A href="/events" class="flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden="true">⬡</span>
            イベント管理
          </A>
          <div class="flex items-center gap-3">
            <span class="rounded-full bg-gray-100 px-3 py-1 text-sm">{props.displayName ?? "Guest"}</span>
            <button
              type="button"
              class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
              onClick={handleLogout}
            >
              ログアウト
            </button>
          </div>
        </header>
      </Show>
      <main class="mx-auto max-w-6xl px-6 py-8">{props.children}</main>
    </div>
  );
};
