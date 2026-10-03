"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { Card } from "@/components/ui/Card";
import { EmptyState, TableSkeleton } from "@/components/ui/States";
import { ContributionFiltersBar } from "@/features/contributions/ContributionFiltersBar";
import { ContributionList } from "@/features/contributions/ContributionList";
import {
  contributionsKey,
  type ContributionFilters,
} from "@/lib/api/contributions";
import { listMemberships } from "@/lib/api/memberships";
import { useQuery } from "@/lib/query/hooks";
import type { ContributionStatus, MembershipOut } from "@/types/api";

const STATUSES: ContributionStatus[] = ["PENDING", "CONFIRMED", "REVERSED"];

/**
 * Contributions page body: filter state lives in the URL so a filtered view can
 * be linked (e.g. "show me my pending contributions"). Requires a Suspense
 * boundary because it reads search params.
 */
export function ContributionExplorer() {
  const { activeChamaId } = useChama();
  const chamaId = activeChamaId;
  const { myMembership, capabilities } = useMemberRoles(chamaId);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );

  const filters = useMemo<ContributionFilters>(() => {
    const statusParam = searchParams.get("status");
    const periodParam = searchParams.get("period");
    return {
      membership_id: searchParams.get("membership") || undefined,
      period: periodParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodParam) ? periodParam : undefined,
      status:
        statusParam && (STATUSES as string[]).includes(statusParam)
          ? (statusParam as ContributionStatus)
          : undefined,
    };
  }, [searchParams]);
  const effectiveFilters = capabilities.isLeadership
    ? filters
    : { ...filters, membership_id: myMembership?.id };
  const visibleMemberships = capabilities.isLeadership
    ? memberships.data ?? []
    : myMembership
      ? [myMembership]
      : [];

  const setFilters = useCallback(
    (next: ContributionFilters) => {
      const params = new URLSearchParams();
      if (next.membership_id) params.set("membership", next.membership_id);
      if (next.period) params.set("period", next.period);
      if (next.status) params.set("status", next.status);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  return (
    <Card title="Contributions">
      <div className="mb-4">
        {capabilities.isLeadership ? (
          <ContributionFiltersBar
            filters={effectiveFilters}
            memberships={visibleMemberships}
            onChange={setFilters}
          />
        ) : (
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Showing only your contribution history.
          </p>
        )}
      </div>

      {memberships.isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : !capabilities.isLeadership && !myMembership ? (
        <EmptyState
          title="Membership not found"
          description="Your active membership is not available in this Chama."
        />
      ) : (
        <ContributionList
          filters={effectiveFilters}
          cacheKey={contributionsKey(chamaId ?? "", effectiveFilters)}
        />
      )}
    </Card>
  );
}
