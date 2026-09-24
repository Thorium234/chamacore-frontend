/**
 * Token storage for the ChamaCore consumer UI.
 *
 * Threat model: tokens are stored in `localStorage`, which is readable by any
 * script running on this origin. That is a deliberate trade-off for a
 * server-rendered-first consumer SPA with a refresh-token flow:
 *
 * - The access token is short-lived (~120 min) and only used in memory by the
 *   axios client.
 * - The refresh token is single-use and rotates on every refresh; a stolen
 *   token can be replayed once, after which the backend revokes the session.
 * - We never log tokens, never send them to any origin except the configured
 *   API base URL, and the backend remains the enforcement point for every
 *   authorization decision.
 *
 * Both tokens are cleared on logout and on any failed refresh.
 */

const ACCESS_TOKEN_KEY = "chamacore.access_token";
const REFRESH_TOKEN_KEY = "chamacore.refresh_token";

interface StoredTokens {
  access_token: string | null;
  refresh_token: string | null;
}

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readTokens(): StoredTokens {
  const storage = safeLocalStorage();
  if (!storage) return { access_token: null, refresh_token: null };
  return {
    access_token: storage.getItem(ACCESS_TOKEN_KEY),
    refresh_token: storage.getItem(REFRESH_TOKEN_KEY),
  };
}

export function getAccessToken(): string | null {
  return readTokens().access_token;
}

export function getRefreshToken(): string | null {
  return readTokens().refresh_token;
}

export function setTokens(tokens: { access_token: string; refresh_token: string }): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
}