"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useSession } from "@/features/auth/session";
import { getChama, listMyChamas } from "@/lib/api/chamas";
import {
  invalidate,
  invalidateChamaScope,
  refetchEntry,
  seedEntry,
} from "@/lib/query/cache";
import { useQuery } from "@/lib/query/hooks";
import type { ApiError } from "@/lib/api/errors";
import type { ChamaOut } from "@/types/api";

const ACTIVE_CHAMA_KEY = "chamacore.active_chama_id";

function readStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable; session still works without persistence.
  }
}

interface ChamaContextValue {
  activeChamaId: string | null;
  activeChama: ChamaOut | undefined;
  isLoadingChama: boolean;
  chamaError: ApiError | null;
  myChamas: ChamaOut[];
  isLoadingMyChamas: boolean;
  myChamasError: ApiError | null;
  refreshMyChamas: () => void;
  setActiveChama: (chamaId: string) => void;
  seedActiveChama: (chama: ChamaOut) => void;
  clearActiveChama: () => void;
}

const ChamaContext = createContext<ChamaContextValue | null>(null);

export function ChamaProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [activeChamaId, setActiveChamaId] = useState<string | null>(() =>
    readStored(ACTIVE_CHAMA_KEY)
  );

  const chamaQuery = useQuery<ChamaOut | null>(
    activeChamaId ? `${activeChamaId}:chama` : null,
    async () => {
      if (!activeChamaId) return null;
      return getChama(activeChamaId);
    }
  );

  useEffect(() => {
    const chamaId = chamaQuery.data?.id;
    if (!chamaId || chamaQuery.data?.status === "ACTIVE") return;
    const timer = window.setInterval(
      () => invalidate(`${chamaId}:chama`),
      20_000
    );
    return () => window.clearInterval(timer);
  }, [chamaQuery.data?.id, chamaQuery.data?.status]);

  // Server-backed list of the authenticated user's Chamas. This is the only
  // source of truth for "which Chamas can I open"; localStorage is just the
  // last-selected preference.
  const myChamasQuery = useQuery<ChamaOut[] | null>(
    status === "authenticated" ? "my-chamas" : null,
    async () => (status === "authenticated" ? listMyChamas() : null)
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      // Clear the persisted selection; the live value is derived below so the
      // shell can never surface a previous Chama after logout.
      writeStored(ACTIVE_CHAMA_KEY, null);
    }
  }, [status]);

  const myChamas = useMemo(() => myChamasQuery.data ?? [], [myChamasQuery.data]);

  // Escape hatch for a Chama created moments ago: a my-chamas request that was
  // already in flight when the Chama was created will not list it yet. State
  // (not a ref) so the value is safe to read while rendering.
  const [createdChamaId, setCreatedChamaId] = useState<string | null>(null);

  // The selection only falls back to "no Chama" once the server list has
  // actually loaded and the stored id is missing from it. While the list is
  // still loading, unavailable, or failed, keep the stored selection so a
  // transient API error never erases the user's Chama (derived value, not a
  // state write — this never runs in an effect).
  const myChamasReady =
    status === "authenticated" && !myChamasQuery.isLoading && !myChamasQuery.error;
  const myChamaIds = useMemo(() => new Set(myChamas.map((c) => c.id)), [myChamas]);

  const visibleActiveChamaId =
    status === "unauthenticated"
      ? null
      : myChamasReady &&
          activeChamaId &&
          createdChamaId !== activeChamaId &&
          !myChamaIds.has(activeChamaId)
        ? null
        : activeChamaId;

  const refreshMyChamas = useCallback(() => {
    if (status === "authenticated") invalidate("my-chamas");
  }, [status]);

  const setActiveChama = useCallback(
    (chamaId: string) => {
      const previous = activeChamaId;
      if (previous && previous !== chamaId) {
        // Never show data from the previously selected Chama.
        invalidateChamaScope(previous);
      }
      setActiveChamaId(chamaId);
      writeStored(ACTIVE_CHAMA_KEY, chamaId);
      setCreatedChamaId(null);
    },
    [activeChamaId]
  );

  const seededChamaRef = useRef<string | null>(null);

  const seedActiveChama = useCallback(
    (chama: ChamaOut) => {
      // Optimistically seed the shell with the create response so it does not
      // block on a GET; a background re-check runs once the query subscribes.
      seedEntry(`${chama.id}:chama`, chama);
      seededChamaRef.current = chama.id;
      const previous = activeChamaId;
      if (previous && previous !== chama.id) {
        invalidateChamaScope(previous);
      }
      setActiveChamaId(chama.id);
      writeStored(ACTIVE_CHAMA_KEY, chama.id);
      // The freshly created Chama must appear in the switcher / onboarding
      // list. Refetch in the background (rather than invalidating) so the
      // cached list stays visible, and the request is issued *after* the
      // create, so its response already contains the new Chama. The state
      // above covers an earlier in-flight list response winning the race.
      setCreatedChamaId(chama.id);
      refetchEntry("my-chamas");
    },
    [activeChamaId]
  );

  useEffect(() => {
    if (!activeChamaId || seededChamaRef.current !== activeChamaId) return;
    seededChamaRef.current = null;
    refetchEntry(`${activeChamaId}:chama`);
  }, [activeChamaId]);

  const clearActiveChama = useCallback(() => {
    if (activeChamaId) invalidateChamaScope(activeChamaId);
    setActiveChamaId(null);
    writeStored(ACTIVE_CHAMA_KEY, null);
    setCreatedChamaId(null);
  }, [activeChamaId]);

  const value = useMemo(
    () => ({
      activeChamaId: visibleActiveChamaId,
      activeChama: chamaQuery.data ?? undefined,
      isLoadingChama: chamaQuery.isLoading,
      chamaError: chamaQuery.error,
      myChamas,
      isLoadingMyChamas: myChamasQuery.isLoading,
      myChamasError: myChamasQuery.error,
      refreshMyChamas,
      setActiveChama,
      seedActiveChama,
      clearActiveChama,
    }),
    [
      visibleActiveChamaId,
      chamaQuery.data,
      chamaQuery.isLoading,
      chamaQuery.error,
      myChamas,
      myChamasQuery.isLoading,
      myChamasQuery.error,
      refreshMyChamas,
      setActiveChama,
      seedActiveChama,
      clearActiveChama,
    ]
  );

  return <ChamaContext.Provider value={value}>{children}</ChamaContext.Provider>;
}

export function useChama(): ChamaContextValue {
  const context = useContext(ChamaContext);
  if (!context) {
    throw new Error("useChama must be used within a ChamaProvider");
  }
  return context;
}
