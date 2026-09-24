"use client";

import { useCallback, useRef, useState } from "react";

import { useQuery } from "@/lib/query/hooks";
import { getEntryState, mergeData } from "@/lib/query/cache";
import { toApiError, type ApiError } from "@/lib/api/errors";

interface Page<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface CursorPager<T> {
  items: T[];
  hasMore: boolean;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => void;
  loadingMore: boolean;
  loadMoreError: ApiError | null;
  loadMore: () => void;
}

/**
 * Server-side cursor pagination on top of the shared query cache. Page 1 is a
 * plain `useQuery` under `<key>`; loading more appends the next page into the
 * SAME cache entry, so items, cursor, and has_more all stay inside the
 * single-key snapshot and no component-local accumulation is needed. Because
 * each Chama/account has its own key, switching context naturally starts a
 * fresh first page.
 */
export function useCursorPager<T>(options: {
  key: string | null;
  fetchPage: (cursor: string | null) => Promise<Page<T>>;
}): CursorPager<T> {
  const { key, fetchPage } = options;

  const query = useQuery<Page<T>>(key, () => fetchPage(null));

  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<ApiError | null>(null);
  const busyRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!key || busyRef.current) return;
    const snapshot = getEntryState(key);
    if (!snapshot || snapshot.status !== "success") return;
    const head = snapshot.data as Page<T>;
    if (!head.next_cursor) return;
    busyRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const next = await fetchPage(head.next_cursor);
      mergeData<Page<T>>(key, {
        items: [...head.items, ...next.items],
        next_cursor: next.next_cursor,
        has_more: next.has_more,
      });
    } catch (err) {
      setLoadMoreError(toApiError(err));
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [key, fetchPage]);

  const items = query.data?.items ?? [];

  return {
    items,
    hasMore: Boolean(query.data && query.data.next_cursor),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    loadingMore,
    loadMoreError,
    loadMore,
  };
}