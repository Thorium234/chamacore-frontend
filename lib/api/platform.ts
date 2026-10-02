/**
 * Platform-admin routes (F3).
 *
 * **There is no endpoint that reports whether the current user is a platform
 * admin.** `UserOut` carries no platform roles and `platform_roles` only appears
 * on `PlatformUserOut`, which is itself admin-gated. `isPlatformAdmin()` below is
 * therefore a probe: it calls a cheap `GET /platform/stats` and treats 403 as
 * "not an admin" rather than as an error.
 */

import { api } from "@/lib/api/client";
import { isPermissionDenied } from "@/lib/api/errors";
import type {
  PlatformChamaListParams,
  PlatformChamaOut,
  PlatformChamaStatusUpdate,
  PlatformStatsOut,
  PlatformUserListParams,
  PlatformUserOut,
} from "@/types/api";

export async function getPlatformStats(): Promise<PlatformStatsOut> {
  const { data } = await api.get<PlatformStatsOut>("/platform/stats");
  return data;
}

/**
 * Resolves platform-admin status by probing.
 *
 * A 403 is the authoritative "no", not a failure, so it resolves `false`
 * instead of throwing. Only a 200 confirms admin.
 */
export async function isPlatformAdmin(): Promise<boolean> {
  try {
    await api.get<PlatformStatsOut>("/platform/stats");
    return true;
  } catch (error) {
    if (isPermissionDenied(error)) return false;
    throw error;
  }
}

export async function listPlatformChamas(
  params: PlatformChamaListParams = {}
): Promise<PlatformChamaOut[]> {
  const { data } = await api.get<PlatformChamaOut[]>("/platform/chamas", { params });
  return data;
}

export async function getPlatformChama(chamaId: string): Promise<PlatformChamaOut> {
  const { data } = await api.get<PlatformChamaOut>(`/platform/chamas/${chamaId}`);
  return data;
}

/**
 * Lifecycle change. `PATCH`, body `{ status, reason }` (`platform.py:54`).
 *
 * Illegal transitions come back as 400 `INVALID_STATE`; the UI only offers legal
 * ones from `PLATFORM_STATUS_TRANSITIONS`.
 */
export async function setPlatformChamaStatus(
  chamaId: string,
  payload: PlatformChamaStatusUpdate
): Promise<PlatformChamaOut> {
  const { data } = await api.patch<PlatformChamaOut>(
    `/platform/chamas/${chamaId}/status`,
    payload
  );
  return data;
}

export async function listPlatformUsers(
  params: PlatformUserListParams = {}
): Promise<PlatformUserOut[]> {
  const { data } = await api.get<PlatformUserOut[]>("/platform/users", { params });
  return data;
}

export async function grantPlatformAdmin(userId: string): Promise<PlatformUserOut> {
  const { data } = await api.post<PlatformUserOut>(
    `/platform/users/${userId}/roles/PLATFORM_ADMIN`
  );
  return data;
}

export async function revokePlatformAdmin(userId: string): Promise<PlatformUserOut> {
  const { data } = await api.delete<PlatformUserOut>(
    `/platform/users/${userId}/roles/PLATFORM_ADMIN`
  );
  return data;
}

/**
 * Forces a password reset flag on a user. `reason` is a query param, not a body.
 *
 * The backend flips `must_change_password` to true; the frontend gate takes over
 * on that user's next login.
 */
export async function requirePasswordChange(
  userId: string,
  reason?: string | null
): Promise<PlatformUserOut> {
  const { data } = await api.post<PlatformUserOut>(
    `/platform/users/${userId}/require-password-change`,
    undefined,
    { params: reason ? { reason } : undefined }
  );
  return data;
}