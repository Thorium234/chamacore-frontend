"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { useChama } from "@/features/chamas/ChamaContext";
import { Spinner } from "@/components/ui/States";

/** Redirect direct visits to Chama management pages away from non-executives. */
export function RequireLeadership({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { activeChamaId } = useChama();
  const { capabilities, isLoading } = useMemberRoles(activeChamaId);

  useEffect(() => {
    if (!isLoading && !capabilities.isLeadership) router.replace("/dashboard");
  }, [capabilities.isLeadership, isLoading, router]);

  if (isLoading || !capabilities.isLeadership) {
    return (
      <div className="flex min-h-48 items-center justify-center" aria-label="Checking access">
        <Spinner />
      </div>
    );
  }

  return children;
}
