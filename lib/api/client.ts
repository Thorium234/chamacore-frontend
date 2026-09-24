/**
 * The single shared HTTP client for ChamaCore.
 *
 * All domain API modules import from here; no page may build its own `fetch`
 * or axios call. Responsibilities:
 *
 * - base URL from `NEXT_PUBLIC_API_BASE_URL`
 * - bearer token attachment
 * - request correlation (`X-Request-ID`)
 * - refresh handling: on 401 (one refresh, single-flight when many requests
 *   fail, then one retry); on refresh failure we clear the session and notify
 *   the auth provider so it can redirect to login
 * - centralized error normalization (see `errors.ts`)
 */

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/token-store";
import { toApiError } from "@/lib/api/errors";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");
const API_PREFIX = "/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes("/auth/token") ||
    url.includes("/auth/register") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/logout")
  );
}

function requestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers["X-Request-ID"]) {
    config.headers["X-Request-ID"] = requestId();
  }
  return config;
});

let refreshPromise: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

/** Register a callback invoked when a refresh fails (session is over). */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const { data } = await axios.post(`${API_BASE_URL}${API_PREFIX}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    setTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

/** Single-flight refresh: many concurrent 401s share one refresh attempt. */
function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableRequestConfig | undefined;
    const url = config?.url ?? "";
    const status = error.response?.status;

    if (
      status === 401 &&
      config &&
      !config._retried &&
      !isAuthEndpoint(url)
    ) {
      const ok = await refreshAccessToken();
      if (ok) {
        config._retried = true;
        config.headers.Authorization = `Bearer ${getAccessToken()}`;
        return api(config);
      }
      onSessionExpired?.();
    }

    return Promise.reject(toApiError(error));
  }
);