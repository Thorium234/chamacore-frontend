/**
 * Notification feed (F9).
 *
 * Every route is scoped to the authenticated user server-side, so there is no
 * user id parameter anywhere (`app/api/v1/notifications.py`).
 */

import { api } from "@/lib/api/client";
import type {
  MarkAllReadOut,
  NotificationListParams,
  NotificationOut,
  UnreadCountOut,
} from "@/types/api";

export async function listNotifications(
  params: NotificationListParams = {}
): Promise<NotificationOut[]> {
  const { data } = await api.get<NotificationOut[]>("/notifications", { params });
  return data;
}

export async function getUnreadCount(): Promise<UnreadCountOut> {
  const { data } = await api.get<UnreadCountOut>("/notifications/unread-count");
  return data;
}

export async function markNotificationRead(notificationId: string): Promise<NotificationOut> {
  const { data } = await api.post<NotificationOut>(
    `/notifications/${notificationId}/read`
  );
  return data;
}

export async function markAllNotificationsRead(): Promise<MarkAllReadOut> {
  const { data } = await api.post<MarkAllReadOut>("/notifications/read-all");
  return data;
}

/** Idempotent server-side: deleting an already-deleted id still returns 204. */
export async function deleteNotification(notificationId: string): Promise<void> {
  await api.delete(`/notifications/${notificationId}`);
}