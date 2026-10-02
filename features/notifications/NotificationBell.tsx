"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  getUnreadCount,
  markAllNotificationsRead,
} from "@/lib/api/notifications";
import { useQuery } from "@/lib/query/hooks";
import { invalidate } from "@/lib/query/cache";
import { cx } from "@/components/ui/cx";

const COUNT_KEY = "notifications:unread-count";

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

/**
 * Unread badge for the notification feed.
 *
 * There is no WebSocket or push channel on the backend, so the count is polled
 * rather than pushed. The interval is deliberately coarse: the badge is ambient
 * information, and the feed itself refreshes when it is opened.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unread = useQuery(COUNT_KEY, getUnreadCount, { refetchInterval: 60_000 });

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const count = unread.data?.unread_count ?? 0;

  async function handleMarkAll() {
    await markAllNotificationsRead();
    invalidate(COUNT_KEY);
    invalidate("notifications");
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          count > 0 ? `Notifications, ${count} unread` : "Notifications"
        }
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-md p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <BellIcon />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Notifications
            </p>
            <div className="flex items-center gap-2">
              {count > 0 ? (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Mark all read
                </button>
              ) : null}
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className={cx(
                  "text-xs font-medium text-indigo-600 hover:text-indigo-700"
                )}
              >
                View all
              </Link>
            </div>
          </div>

          {count === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              You are all caught up.
            </p>
          ) : (
            <p className="px-2 py-4 text-sm text-zinc-500 dark:text-zinc-400">
              Open the notifications page to read the {count} unread item
              {count === 1 ? "" : "s"}.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Exposed for the notifications page, which refreshes the same keys. */
export const NOTIFICATION_KEYS = { count: COUNT_KEY, list: "notifications" };