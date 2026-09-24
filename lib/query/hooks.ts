import { useCallback, useState, useSyncExternalStore } from "react";

import {
  ensureEntry,
  getSnapshot,
  invalidate,
  subscribe,
} from "@/lib/query/cache";
import { toApiError, type ApiError } from "@/lib/api/errors";

export interface UseQueryResult<T> {
  data: T | undefined;
  error: ApiError | null;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Declarative query bound to a cache key. The key is the source of truth
 * (e.g. `${chamaId}:memberships`); a key change subscribes to a new entry and
 * `invalidate(prefix)` triggers refetch. The fetcher is captured per render so
 * it always targets the same key (key + fetcher change together).
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>): UseQueryResult<T> {
  const subscribeForKey = useCallback(
    (onStoreChange: () => void) => {
      if (!key) return () => {};
      ensureEntry(key, fetcher);
      return subscribe(onStoreChange);
    },
    [key, fetcher]
  );

  const getSnapshotForKey = useCallback(() => {
    if (!key) return undefined;
    return getSnapshot(key);
  }, [key]);

  const state = useSyncExternalStore(subscribeForKey, getSnapshotForKey, getSnapshotForKey);

  const refetch = useCallback(() => {
    if (key) invalidate(key);
  }, [key]);

  return {
    data: state?.status === "success" ? (state.data as T) : undefined,
    error: state?.status === "error" ? state.error : null,
    isLoading: state === undefined || state.status === "loading",
    refetch,
  };
}

export interface UseMutationResult<TArgs extends unknown[], TResult> {
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
  mutate: (...args: TArgs) => Promise<TResult | undefined>;
}

export interface UseMutationOptions<TArgs extends unknown[], TResult> {
  /** Cache key prefixes to refresh when the mutation succeeds. */
  invalidates?: string[];
  onSuccess?: (result: TResult, args: TArgs) => void;
  onError?: (error: ApiError) => void;
}

/**
 * Mutation helper: sets pending, normalizes errors, and invalidates affected
 * query scopes on success. Financial forms use `isPending` to disable the
 * submit button (double-submit protection).
 */
export function useMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: UseMutationOptions<TArgs, TResult> = {}
): UseMutationResult<TArgs, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = async (...args: TArgs) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await fn(...args);
      for (const prefix of options.invalidates ?? []) {
        invalidate(prefix);
      }
      options.onSuccess?.(result, args);
      return result;
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError);
      options.onError?.(apiError);
      return undefined;
    } finally {
      setIsPending(false);
    }
  };

  const reset = () => setError(null);

  return { isPending, error, reset, mutate };
}