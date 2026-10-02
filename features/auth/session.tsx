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
import { setSessionExpiredHandler } from "@/lib/api/client";
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
   * Server-driven password-change gate. The backend does not enforce this on any
   * dependency (`app/api/deps.py:68`), so the app shell reads it and blocks the
   * app until the password is changed.
   */
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
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

    return () => {
      cancelled = true;
      setSessionExpiredHandler(null);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens: TokenOut = await loginApi(email, password);
    setTokens({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
    clearAll();
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
   * Changing the password ends the session.
   *
   * The backend revokes every refresh token for the user
   * (`app/services/auth.py:105`) but the current access token stays valid until
   * it expires. Leaving the client authenticated would look like a successful
   * sign-in that silently dies ~120 minutes later, so we clear local state and
   * make the user authenticate again with the new password.
   */
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await changePasswordApi({
      current_password: currentPassword,
      new_password: newPassword,
    });
    clearSessionStorage();
    clearAll();
    setUser(null);
    setStatus("unauthenticated");
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