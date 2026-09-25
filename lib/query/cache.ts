/**
 * Minimal server-state cache for ChamaCore.
 *
 * One source of truth per query key with cached data, deduplicated in-flight
 * requests, and prefix-based invalidation (`invalidate("contributions")`
 * refreshes every Chama-scoped contributions query). Global state stays tiny:
 * session + active Chama live in React context; everything else is keyed API
 * data.
 */

import type { ApiError } from "@/lib/api/errors";
import { toApiError } from "@/lib/api/errors";

export type QueryState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: ApiError };

interface Entry<T> {
  key: string;
  fetcher?: () => Promise<T>;
  state: QueryState<T>;
}

const entries = new Map<string, Entry<unknown>>();
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(key: string): QueryState<unknown> | undefined {
  return entries.get(key)?.state;
}

/** Live view of an entry's current state (used by incremental loaders). */
export function getEntryState(key: string): QueryState<unknown> | undefined {
  return entries.get(key)?.state;
}

/** Replace an entry's resolved data in place (e.g. appended paging results). */
export function mergeData<T>(key: string, data: T): void {
  const entry = entries.get(key);
  if (!entry || entry.state.status !== "success") return;
  entry.state = { status: "success", data };
  emit();
}

/** Seed an entry with resolved data without issuing a request (optimistic UI). */
export function seedEntry<T>(key: string, data: T): void {
  const existing = entries.get(key);
  entries.set(key, {
    key,
    fetcher: existing ? existing.fetcher as () => Promise<T> : undefined,
    state: { status: "success", data },
  });
  emit();
}

/** Re-run an entry's fetch in the background while cached data stays visible. */
export function refetchEntry(key: string): void {
  const entry = entries.get(key);
  if (!entry || !entry.fetcher) return;
  void run(entry);
}

function emit(): void {
  for (const listener of listeners) listener();
}

async function run<T>(entry: Entry<T>): Promise<void> {
  if (!entry.fetcher) return;
  try {
    const data = await entry.fetcher();
    entry.state = { status: "success", data };
  } catch (err) {
    entry.state = { status: "error", error: toApiError(err) };
  }
  emit();
}

export function ensureEntry<T>(key: string, fetcher: () => Promise<T>): void {
  const existing = entries.get(key);
  if (!existing) {
    const entry: Entry<T> = { key, fetcher, state: { status: "loading" } };
    entries.set(key, entry);
    emit();
    void run(entry);
    return;
  }
  if (existing.fetcher !== fetcher) {
    existing.fetcher = fetcher as Entry<unknown>["fetcher"];
  }
}

export function invalidate(prefix: string): void {
  let touched = false;
  for (const [key, entry] of entries) {
    if (key !== prefix && !key.startsWith(`${prefix}:`)) continue;
    if (entry.state.status === "loading") continue;
    entry.state = { status: "loading" };
    touched = true;
    void run(entry);
  }
  if (touched) emit();
}

export function dropEntry(key: string): void {
  entries.delete(key);
  emit();
}

/** Remove every cached entry for the given chama (on chama switch / logout). */
export function invalidateChamaScope(chamaId: string): void {
  const prefix = `${chamaId}:`;
  if (chamaId) {
    const keys = [...entries.keys()].filter(
      (key) => key === chamaId || key.startsWith(prefix)
    );
    for (const key of keys) entries.delete(key);
  }
  emit();
}

export function clearAll(): void {
  entries.clear();
  emit();
}