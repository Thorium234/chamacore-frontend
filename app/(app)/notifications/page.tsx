"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState, ErrorState } from "@/components/ui/States";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { invalidate } from "@/lib/query/cache";
import { getErrorMessage, toApiError } from "@/lib/api/errors";
import { useQuery } from "@/lib/query/hooks";
import { formatDateTime } from "@/lib/format";
import { NOTIFICATION_KEYS } from "@/features/notifications/NotificationBell";
import type { NotificationOut } from "@/types/api";
import { PageControls } from "@/components/ui/PageControls";

const PAGE_SIZE = 50;

/**
 * Notification feed.
 *
 * The backend sends no badge, severity, or deep-link field — navigation hints are
 * the free-form `action` plus `resource_type`/`resource_id` and `payload`
 * (`app/schemas/notification.py`). We render the link only when we can derive a
 * real in-app route from `resource_type`; anything else renders as plain text
 * rather than guessing a URL.
 */
const RESOURCE_ROUTES: Record<string, string> = {
  contribution: "/contributions",
  payment_intent: "/payments",
  payout: "/payouts",
  loan: "/loans",
  membership: "/members",
  share: "/shares",
  ledger: "/ledger",
  payment_attempt: "/payments",
};

/** `contribution_confirmed` → `Contribution confirmed`. */
function humanizeAction(action: string): string {
  const words = action.replace(/[_.]+/g, " ").trim();
  if (!words) return "Update";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function notificationHref(notification: NotificationOut): string | null {
  if (!notification.resource_type) return null;
  return RESOURCE_ROUTES[notification.resource_type] ?? null;
}

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const pageScope = unreadOnly ? "unread" : "all";
  const [page, setPage] = useState({ scope: "all", offset: 0 });
  const offset = page.scope === pageScope ? page.offset : 0;
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const notifications = useQuery(
    `${NOTIFICATION_KEYS.list}:${unreadOnly ? "unread" : "all"}:offset:${offset}`,
    async () => listNotifications({ unread_only: unreadOnly, limit: PAGE_SIZE, offset })
  );

  function setOffset(next: number | ((current: number) => number)) {
    setPage({
      scope: pageScope,
      offset: typeof next === "function" ? next(offset) : next,
    });
  }

  function refresh() {
    invalidate(NOTIFICATION_KEYS.list);
    invalidate(NOTIFICATION_KEYS.count);
    setOffset(0);
  }

  async function handleMarkAll() {
    setActionError(null);
    try {
      await markAllNotificationsRead();
      refresh();
    } catch (error) {
      setActionError(
        getErrorMessage(toApiError(error)) || "Could not mark all as read."
      );
    }
  }

  async function handleMarkOne(id: string) {
    setPendingId(id);
    setActionError(null);
    try {
      await markNotificationRead(id);
      refresh();
    } catch (error) {
      setActionError(
        getErrorMessage(toApiError(error)) || "Could not mark as read."
      );
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(id: string) {
    setPendingId(id);
    setActionError(null);
    try {
      await deleteNotification(id);
      refresh();
    } catch (error) {
      setActionError(
        getErrorMessage(toApiError(error)) || "Could not delete the notification."
      );
    } finally {
      setPendingId(null);
    }
  }

  const items = notifications.data ?? [];

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Activity the ChamaCore backend has recorded for your account."
      />

      {actionError ? (
        <Alert className="mb-4" title="Action failed">
          {actionError}
        </Alert>
      ) : null}

      <Card
        title="Inbox"
        description={unreadOnly ? "Showing unread only." : "Showing all notifications."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setOffset(0);
                setUnreadOnly((value) => !value);
              }}
            >
              {unreadOnly ? "Show all" : "Show unread only"}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleMarkAll}>
              Mark all read
            </Button>
          </div>
        }
      >
        {notifications.error ? (
          <ErrorState
            message={notifications.error.message}
            onRetry={notifications.refetch}
          />
        ) : notifications.isLoading ? (
          <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Loading notifications…
          </p>
        ) : items.length === 0 ? (
          <EmptyState
            title={offset > 0 ? "No older notifications" : unreadOnly ? "Nothing unread" : "No notifications yet"}
            description={
              offset > 0
                ? "There are no more notifications on this page. Load a newer page."
                : unreadOnly
                ? "You have read everything the Chama has sent you."
                : "Confirmations, payments and approvals will appear here."
            }
          />
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((notification) => {
              const href = notificationHref(notification);
              return (
                <li key={notification.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {notification.title}
                      </span>
                      {!notification.is_read ? (
                        <Badge tone="red">Unread</Badge>
                      ) : null}
                      <Badge>{humanizeAction(notification.action)}</Badge>
                    </div>
                    {notification.body ? (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        {notification.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatDateTime(notification.created_at)}
                      {notification.resource_type
                        ? ` · ${notification.resource_type}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {href ? (
                      <a
                        href={href}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Open
                      </a>
                    ) : null}
                    {!notification.is_read ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={pendingId === notification.id}
                        onClick={() => handleMarkOne(notification.id)}
                      >
                        Mark read
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pendingId === notification.id}
                      onClick={() => handleDelete(notification.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!notifications.isLoading && !notifications.error ? (
          <PageControls
            offset={offset}
            pageSize={PAGE_SIZE}
            itemCount={items.length}
            noun="notifications"
            onPrevious={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
            onNext={() => setOffset((current) => current + PAGE_SIZE)}
          />
        ) : null}
      </Card>
    </div>
  );
}
