"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  changePassword as changePasswordApi,
  getMe,
  linkMeToMember,
  login as loginApi,
  logout as logoutApi,
  registerUser,
} from "@/lib/api/auth";
import {
  setPasswordChangeRequiredHandler,
  setSessionExpiredHandler,
} from "@/lib/api/client";
import {
  clearSessionStorage,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth/token-store";
import { clearAll } from "@/lib/query/cache";
import {
  toApiError,
  type ApiError,
} from "@/lib/api/errors";
import type { MemberLinkPayload, RegisterPayload, TokenOut, UserOut } from "@/types/api";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface SessionContextValue {
  status: SessionStatus;
  user: UserOut | null;
  /**
   * Server-driven password-change gate.
   *
   * `must_change_password` is returned by login, refresh, and `/auth/me`.
   * The backend rejects authenticated API calls while it is set; this flag
   * keeps the client routed to the only permitted password-change screen.
   */
  mustChangePassword: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<UserOut>;
  linkMember: (payload: MemberLinkPayload) => Promise<UserOut>;
  refreshSession: () => Promise<UserOut | null>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<UserOut | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getAccessToken()) {
        if (!cancelled) {
          setStatus("unauthenticated");
          setUser(null);
        }
        return;
      }
      try {
        const me = await getMe();
        if (!cancelled) {
          setUser(me);
          setStatus("authenticated");
        }
      } catch {
        // Client already tried one refresh; both the token and session are gone.
        clearSessionStorage();
        clearAll();
        if (!cancelled) {
          setUser(null);
          setStatus("unauthenticated");
        }
      }
    }

    void bootstrap();

    setSessionExpiredHandler(() => {
      clearSessionStorage();
      clearAll();
      if (!cancelled) {
        setUser(null);
        setStatus("unauthenticated");
      }
    });
    setPasswordChangeRequiredHandler(() => {
      setUser((current) =>
        current ? { ...current, must_change_password: true } : current
      );
    });

    return () => {
      cancelled = true;
      setSessionExpiredHandler(null);
      setPasswordChangeRequiredHandler(null);
    };
  }, []);

  /**
   * `identifier` is the OAuth2 `username` form field. The backend resolves it as
   * email, then normalized phone, then government ID
   * (`app/services/auth.py::authenticate`). Phone and national ID live on the
   * linked member record, so they only resolve for users whose `member_id` is
   * set. Bad credentials return a deliberately generic 401 that does not reveal
   * which identifier matched.
   */
  const login = useCallback(async (identifier: string, password: string) => {
    const tokens: TokenOut = await loginApi(identifier, password);
    setTokens({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
    clearAll();
    // `GET /auth/me` rather than trusting `TokenOut.must_change_password`: the
    // profile is needed anyway, and it is the same field the gate reads.
    const me = await getMe();
    setUser(me);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    return registerUser(payload);
  }, []);

  const linkMember = useCallback(async (payload: MemberLinkPayload) => {
    const updated = await linkMeToMember(payload);
    setUser(updated);
    return updated;
  }, []);

  const refreshSession = useCallback(async () => {
    const me = await getMe();
    setUser(me);
    return me;
  }, []);

  /**
   * Changing the password keeps the user signed in.
   *
   * The backend writes the replacement hash, clears `must_change_password`,
   * and revokes every refresh token in the same transaction. The current access
   * token remains valid only until its short expiry, so reload `/auth/me` to
   * lift the forced-change gate without retaining a new long-lived credential.
   */
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await changePasswordApi({
      current_password: currentPassword,
      new_password: newPassword,
    });
    const me = await getMe();
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // Best-effort revocation; local session is cleared regardless.
      }
    }
    // Wipe every persisted chamacore.* key, not just the tokens: the selected
    // Chama is per-user state and must not leak to the next account signed in
    // on this browser.
    clearSessionStorage();
    clearAll();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      mustChangePassword: user?.must_change_password ?? false,
      login,
      register,
      linkMember,
      refreshSession,
      changePassword,
      logout,
    }),
    [status, user, login, register, linkMember, refreshSession, changePassword, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

export { toApiError };
export type { ApiError };
