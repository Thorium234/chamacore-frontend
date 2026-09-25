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
import { getChama } from "@/lib/api/chamas";
import {
  invalidateChamaScope,
  refetchEntry,
  seedEntry,
} from "@/lib/query/cache";
import { useQuery } from "@/lib/query/hooks";
import type { ApiError } from "@/lib/api/errors";
import type { ChamaOut } from "@/types/api";

const ACTIVE_CHAMA_KEY = "chamacore.active_chama_id";
const KNOWN_CHAMAS_KEY = "chamacore.known_chama_ids";

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

function readKnownChamas(): string[] {
  const raw = readStored(KNOWN_CHAMAS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // Ignore corrupt storage.
  }
  return [];
}

function writeKnownChamas(ids: string[]): void {
  writeStored(KNOWN_CHAMAS_KEY, JSON.stringify(ids));
}

interface ChamaContextValue {
  activeChamaId: string | null;
  activeChama: ChamaOut | undefined;
  isLoadingChama: boolean;
  chamaError: ApiError | null;
  knownChamaIds: string[];
  setActiveChama: (chamaId: string) => void;
  seedActiveChama: (chama: ChamaOut) => void;
  rememberChama: (chamaId: string) => void;
  clearActiveChama: () => void;
}

const ChamaContext = createContext<ChamaContextValue | null>(null);

export function ChamaProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [activeChamaId, setActiveChamaId] = useState<string | null>(() =>
    readStored(ACTIVE_CHAMA_KEY)
  );
  const [knownChamaIds, setKnownChamaIds] = useState<string[]>(() => readKnownChamas());

  const chamaQuery = useQuery<ChamaOut | null>(
    activeChamaId ? `${activeChamaId}:chama` : null,
    async () => {
      if (!activeChamaId) return null;
      return getChama(activeChamaId);
    }
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      // Clear the persisted selection; the live value is derived below so the
      // shell can never surface a previous Chama after logout.
      writeStored(ACTIVE_CHAMA_KEY, null);
    }
  }, [status]);

  // After logout the active selection is hidden even while the provider keeps
  // its internal state (derivation, not a state write).
  const visibleActiveChamaId = status === "unauthenticated" ? null : activeChamaId;

  const rememberChama = useCallback((chamaId: string) => {
    setKnownChamaIds((previous) => {
      if (previous.includes(chamaId)) return previous;
      const next = [chamaId, ...previous].slice(0, 20);
      writeKnownChamas(next);
      return next;
    });
  }, []);

  const setActiveChama = useCallback(
    (chamaId: string) => {
      const previous = activeChamaId;
      if (previous && previous !== chamaId) {
        // Never show data from the previously selected Chama.
        invalidateChamaScope(previous);
      }
      setActiveChamaId(chamaId);
      writeStored(ACTIVE_CHAMA_KEY, chamaId);
      rememberChama(chamaId);
    },
    [activeChamaId, rememberChama]
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
      rememberChama(chama.id);
    },
    [activeChamaId, rememberChama]
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
  }, [activeChamaId]);

  const value = useMemo(
    () => ({
      activeChamaId: visibleActiveChamaId,
      activeChama: chamaQuery.data ?? undefined,
      isLoadingChama: chamaQuery.isLoading,
      chamaError: chamaQuery.error,
      knownChamaIds,
      setActiveChama,
      seedActiveChama,
      rememberChama,
      clearActiveChama,
    }),
    [
      visibleActiveChamaId,
      chamaQuery.data,
      chamaQuery.isLoading,
      chamaQuery.error,
      knownChamaIds,
      setActiveChama,
      seedActiveChama,
      rememberChama,
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