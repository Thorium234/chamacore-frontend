"use client";

import { useMemo, useState } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { Table, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { ContributionFiltersBar } from "@/features/contributions/ContributionFiltersBar";
import {
  contributionsKey,
  listContributions,
  type ContributionFilters,
} from "@/lib/api/contributions";
import { listMemberships } from "@/lib/api/memberships";
import { useQuery } from "@/lib/query/hooks";
import { formatMoney, formatPeriod } from "@/lib/format";
import type { ContributionOut, MembershipOut } from "@/types/api";

/**
 * Read-only group contributions list for every active member (transparency).
 *
 * No confirm/reverse actions here by design — settling a contribution is a
 * chairperson action and lives on the Contributions page. Filters are applied by
 * the API.
 */
export function GroupContributions() {
  const { activeChamaId } = useChama();
  const chamaId = activeChamaId;
  const [filters, setFilters] = useState<ContributionFilters>({});

  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );

  const contributions = useQuery<ContributionOut[]>(
    chamaId ? contributionsKey(chamaId, { ...filters, limit: 100 }) : null,
    async () =>
      chamaId ? listContributions(chamaId, { ...filters, limit: 100 }) : []
  );

  const membersById = useMemo(
    () => new Map((memberships.data ?? []).map((m) => [m.id, m])),
    [memberships.data]
  );

  const hasFilters =
    Boolean(filters.membership_id) || Boolean(filters.period) || Boolean(filters.status);

  if (memberships.isLoading || contributions.isLoading) {
    return <TableSkeleton rows={5} cols={4} />;
  }
  if (contributions.error) {
    return <ErrorState message={contributions.error.message} onRetry={contributions.refetch} />;
  }

  return (
    <div className="space-y-4">
      <ContributionFiltersBar
        filters={filters}
        memberships={memberships.data ?? []}
        onChange={setFilters}
      />

      {(contributions.data?.length ?? 0) === 0 ? (
        <EmptyState
          title={hasFilters ? "No contributions match these filters" : "No contributions recorded"}
          description={
            hasFilters
              ? "Try widening or clearing the filters above."
              : "Contributions appear here once leadership records them."
          }
        />
      ) : (
        <>
          <Table head={["Member", "Period", "Amount", "Status"]}>
            {(contributions.data ?? []).map((contribution) => {
              const membership = membersById.get(contribution.membership_id);
              return (
                <tr key={contribution.id}>
                  <Td>
                    {membership?.member
                      ? `${membership.member.last_name} ${membership.member.first_name} (#${membership.membership_number})`
                      : contribution.membership_id.slice(0, 8)}
                  </Td>
                  <Td>{formatPeriod(contribution.period)}</Td>
                  <Td>{formatMoney(contribution.amount)}</Td>
                  <Td>
                    <StatusBadge status={contribution.status} />
                  </Td>
                </tr>
              );
            })}
          </Table>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Showing up to the 100 most recent matching records. Narrow the filters to see older
            ones.
          </p>
        </>
      )}
    </div>
  );
}
