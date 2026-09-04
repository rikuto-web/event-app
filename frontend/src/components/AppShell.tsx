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
    <div class="app-shell">
      <Show when={props.isAuthenticated}>
        <header class="app-header">
          <div class="app-header-inner">
            <A href="/events" class="app-logo">
              <span class="app-logo-mark" aria-hidden="true">
                Ev
              </span>
              イベント管理
            </A>
            <div class="app-user-menu">
              <span class="app-user-badge">{props.displayName ?? "Guest"}</span>
              <button type="button" class="btn btn-ghost btn-sm" onClick={handleLogout}>
                ログアウト
              </button>
            </div>
          </div>
        </header>
      </Show>
      <main class="app-main">{props.children}</main>
    </div>
  );
};
