const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8080/api/v1";

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let accessTokenProvider: (() => string | null) | null = null;

export function setAccessTokenProvider(provider: () => string | null) {
  accessTokenProvider = provider;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: Array<{ field: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Array<{ field: string; message: string }> = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

type FetchJsonOptions = RequestInit & {
  accessToken?: string | null;
};

export async function fetchJson<T>(path: string, init?: FetchJsonOptions): Promise<T> {
  const { accessToken, headers, ...requestInit } = init ?? {};
  const token = accessToken ?? accessTokenProvider?.() ?? null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    ...requestInit,
  });

  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string; details?: Array<{ field: string; message: string }> } }
      | null;
    const error = body?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "HTTP_ERROR",
      error?.message ?? `Request failed: ${response.status}`,
      error?.details ?? [],
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export { API_BASE_URL };
