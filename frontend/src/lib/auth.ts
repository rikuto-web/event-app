import { createSignal } from "solid-js";
import { fetchJson, setAccessTokenProvider } from "./api";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export type User = {
  id: string;
  email: string;
  display_name: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
};

type RegisterPayload = {
  email: string;
  display_name: string;
  password: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

const [currentUser, setCurrentUserState] = createSignal<User | null>(null);

let accessToken: string | null = null;

function readStoredAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function loadSession(): void {
  accessToken = readStoredAccessToken();
}

setAccessTokenProvider(getAccessToken);

export function getAccessToken(): string | null {
  return accessToken ?? readStoredAccessToken();
}

export function getCurrentUser(): User | null {
  return currentUser();
}

export function setCurrentUser(user: User | null): void {
  setCurrentUserState(user);
}

export function setTokens(tokens: TokenResponse): void {
  accessToken = tokens.access_token;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearSession(): void {
  accessToken = null;
  setCurrentUser(null);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function register(payload: RegisterPayload): Promise<User> {
  return fetchJson<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginPayload): Promise<User> {
  const tokens = await fetchJson<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setTokens(tokens);
  return fetchCurrentUser();
}

export async function registerAndLogin(payload: RegisterPayload): Promise<User> {
  await register(payload);
  return login({ email: payload.email, password: payload.password });
}

export async function fetchCurrentUser(): Promise<User> {
  const user = await fetchJson<User>("/users/me");
  setCurrentUser(user);
  return user;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken && getAccessToken()) {
    try {
      await fetchJson<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Ignore logout API errors and clear local session anyway.
    }
  }
  clearSession();
}
