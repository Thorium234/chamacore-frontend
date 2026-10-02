"use client";

import type { ReactNode } from "react";

import { AccessDenied } from "@/features/roles/AccessDenied";
import { usePlatformAdmin } from "@/features/platform/usePlatformAdmin";
import { ErrorState } from "@/components/ui/States";

/**
 * Route guard for the platform console.
 *
 * Admin status is a *probe*, not a flag on the user, so this waits for the probe
 * rather than assuming. A probe failure that is not a 403 (network, 5xx) is
 * shown as an error instead of silently rendering "no permission" — the honest
 * answer is "we could not check".
 */
export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, isChecking, error, recheck } = usePlatformAdmin();

  if (isChecking) {
    return (
      <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Checking your permissions…
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={`Could not verify your platform permissions: ${error}`}
        onRetry={recheck}
      />
    );
  }

  if (isAdmin) return <>{children}</>;

  return (
    <AccessDenied
      title="This is a platform administrator area"
      message="Only accounts with the global platform admin role can open this console. It is separate from any Chama role you hold."
      requirement="a platform administrator"
    />
  );
}