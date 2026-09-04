import { Show, createResource, onMount, type Component, type JSX } from "solid-js";
import { Navigate, Route, Router, useLocation, useNavigate } from "@solidjs/router";
import { AppShell } from "./components/AppShell";
import { setUnauthorizedHandler } from "./lib/api";
import {
  clearSession,
  fetchCurrentUser,
  getCurrentUser,
  isAuthenticated,
  loadSession,
  logout,
} from "./lib/auth";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

const Root: Component<{ children?: JSX.Element }> = (props) => {
  const navigate = useNavigate();

  onMount(() => {
    loadSession();
    setUnauthorizedHandler(() => {
      clearSession();
      navigate("/login");
    });
  });

  return props.children;
};

const RequireAuth: Component<{ children: JSX.Element }> = (props) => {
  const location = useLocation();

  if (!isAuthenticated()) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate href={`/login?redirect=${redirect}`} />;
  }

  return props.children;
};

const GuestOnly: Component<{ children: JSX.Element }> = (props) => {
  if (isAuthenticated()) {
    return <Navigate href="/events" />;
  }

  return props.children;
};

const AuthenticatedLayout: Component<{ children: JSX.Element }> = (props) => {
  const navigate = useNavigate();
  const [user] = createResource(fetchCurrentUser);

  return (
    <Show
      when={!user.error}
      fallback={<Navigate href="/login" />}
    >
      <AppShell
        isAuthenticated
        displayName={user()?.display_name ?? getCurrentUser()?.display_name ?? "..."}
        onLogout={async () => {
          await logout();
          navigate("/login", { replace: true });
        }}
      >
        {props.children}
      </AppShell>
    </Show>
  );
};

const App: Component = () => {
  return (
    <Router root={Root}>
      <Route path="/" component={() => <Navigate href="/events" />} />
      <Route
        path="/events"
        component={() => (
          <RequireAuth>
            <AuthenticatedLayout>
              <HomePage />
            </AuthenticatedLayout>
          </RequireAuth>
        )}
      />
      <Route
        path="/login"
        component={() => (
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        )}
      />
      <Route
        path="/register"
        component={() => (
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        )}
      />
    </Router>
  );
};

export default App;
