"use client";

import { isPlatformAdmin } from "@/lib/api/platform";
import { useQuery } from "@/lib/query/hooks";
import { useSession } from "@/features/auth/session";

const ADMIN_KEY = "platform:is-admin";

/**
 * Whether the current user is a platform admin.
 *
 * The backend has **no** endpoint that reports this: `UserOut` carries no
 * platform roles, and `platform_roles` only appears on the admin-gated
 * `PlatformUserOut`. So we resolve it by probing a cheap platform route and
 * treating a 403 as an authoritative "no" (`lib/api/platform.ts`).
 *
 * The probe is skipped entirely while signed out — a null key means no request is
 * issued, which avoids bouncing an anonymous visitor through the client's 401 →
 * refresh → session-expiry path just by rendering a nav item.
 */
export function usePlatformAdmin(): {
  isAdmin: boolean;
  isChecking: boolean;
  error: string | null;
  recheck: () => void;
} {
  const { status } = useSession();
  const canProbe = status === "authenticated";

  const query = useQuery(
    canProbe ? ADMIN_KEY : null,
    isPlatformAdmin,
    // Re-probe periodically: an admin can be granted or revoked at any time and
    // the client has no push channel for it.
    { refetchInterval: canProbe ? 300_000 : undefined }
  );

  return {
    isAdmin: query.data === true,
    isChecking: canProbe && query.isLoading,
    error: query.error?.message ?? null,
    recheck: query.refetch,
  };
}