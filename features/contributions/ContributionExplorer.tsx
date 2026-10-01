"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useChama } from "@/features/chamas/ChamaContext";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/States";
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
        <ContributionFiltersBar
          filters={filters}
          memberships={memberships.data ?? []}
          onChange={setFilters}
        />
      </div>

      {memberships.isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <ContributionList filters={filters} cacheKey={contributionsKey(chamaId ?? "", filters)} />
      )}
    </Card>
  );
}
