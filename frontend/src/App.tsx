import { onMount, type Component, type JSX } from "solid-js";
import { Navigate, Route, Router, useNavigate } from "@solidjs/router";
import { AppShell } from "./components/AppShell";
import { setUnauthorizedHandler } from "./lib/api";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";

const Root: Component<{ children?: JSX.Element }> = (props) => {
  const navigate = useNavigate();

  onMount(() => {
    setUnauthorizedHandler(() => navigate("/login"));
  });

  return props.children;
};

const AuthenticatedLayout: Component<{ children: JSX.Element }> = (props) => {
  return (
    <AppShell isAuthenticated displayName="Demo User">
      {props.children}
    </AppShell>
  );
};

const App: Component = () => {
  return (
    <Router root={Root}>
      <Route path="/" component={() => <Navigate href="/events" />} />
      <Route
        path="/events"
        component={() => (
          <AuthenticatedLayout>
            <HomePage />
          </AuthenticatedLayout>
        )}
      />
      <Route path="/login" component={LoginPage} />
    </Router>
  );
};

export default App;
