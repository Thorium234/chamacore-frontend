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
  getMe,
  linkMeToMember,
  login as loginApi,
  logout as logoutApi,
  registerUser,
} from "@/lib/api/auth";
import { setSessionExpiredHandler } from "@/lib/api/client";
import {
  clearTokens,
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
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<UserOut>;
  linkMember: (payload: MemberLinkPayload) => Promise<UserOut>;
  refreshSession: () => Promise<UserOut | null>;
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
        clearTokens();
        if (!cancelled) {
          setUser(null);
          setStatus("unauthenticated");
        }
      }
    }

    void bootstrap();

    setSessionExpiredHandler(() => {
      clearTokens();
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

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // Best-effort revocation; local session is cleared regardless.
      }
    }
    clearTokens();
    clearAll();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, linkMember, refreshSession, logout }),
    [status, user, login, register, linkMember, refreshSession, logout]
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