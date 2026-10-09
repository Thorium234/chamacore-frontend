"use client";

import { useMemo, useState } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
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
import { PageControls } from "@/components/ui/PageControls";
import { formatMoney, formatPeriod } from "@/lib/format";
import type { ContributionOut, MembershipOut } from "@/types/api";

const PAGE_SIZE = 25;

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
  const { myMembership, capabilities, isLoading: rolesLoading } = useMemberRoles(chamaId);
  const [filters, setFilters] = useState<ContributionFilters>({});
  const pageScope = JSON.stringify([
    chamaId,
    filters.membership_id ?? null,
    filters.period ?? null,
    filters.status ?? null,
  ]);
  const [page, setPage] = useState({ scope: "", offset: 0 });
  const offset = page.scope === pageScope ? page.offset : 0;

  const memberships = useQuery<MembershipOut[]>(
    chamaId && capabilities.isLeadership ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );

  const contributions = useQuery<ContributionOut[]>(
    chamaId && (capabilities.isLeadership || myMembership)
      ? contributionsKey(chamaId, {
          ...filters,
          membership_id: capabilities.isLeadership ? filters.membership_id : myMembership?.id,
          limit: PAGE_SIZE,
          offset,
        })
      : null,
    async () =>
      chamaId
        ? listContributions(chamaId, {
            ...filters,
            membership_id: capabilities.isLeadership ? filters.membership_id : myMembership?.id,
            limit: PAGE_SIZE,
            offset,
          })
        : []
  );

  const membersById = useMemo(
    () => new Map((memberships.data ?? []).map((m) => [m.id, m])),
    [memberships.data]
  );

  const hasFilters =
    Boolean(filters.membership_id) || Boolean(filters.period) || Boolean(filters.status);

  if (rolesLoading) return <TableSkeleton rows={5} cols={4} />;
  if (!capabilities.isLeadership && !myMembership) {
    return (
      <EmptyState
        title="Membership not found"
        description="Your active membership is not available in this Chama."
      />
    );
  }
  if ((capabilities.isLeadership && memberships.isLoading) || contributions.isLoading) {
    return <TableSkeleton rows={5} cols={4} />;
  }
  if (contributions.error) {
    return <ErrorState message={contributions.error.message} onRetry={contributions.refetch} />;
  }

  return (
    <div className="space-y-4">
      {capabilities.isLeadership ? (
        <ContributionFiltersBar
          filters={filters}
          memberships={memberships.data ?? []}
          onChange={setFilters}
        />
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Showing only your contribution history.
        </p>
      )}

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
          <Table
            head={
              capabilities.isLeadership
                ? ["Member", "Period", "Amount", "Status"]
                : ["Period", "Amount", "Status"]
            }
          >
            {(contributions.data ?? []).map((contribution) => {
              const membership = membersById.get(contribution.membership_id);
              return (
                <tr key={contribution.id}>
                  {capabilities.isLeadership ? (
                    <Td>
                      {membership?.member
                        ? `${membership.member.last_name} ${membership.member.first_name} (#${membership.membership_number})`
                        : contribution.membership_id.slice(0, 8)}
                    </Td>
                  ) : null}
                  <Td>{formatPeriod(contribution.period)}</Td>
                  <Td>{formatMoney(contribution.amount)}</Td>
                  <Td>
                    <StatusBadge status={contribution.status} />
                  </Td>
                </tr>
              );
            })}
          </Table>
          <PageControls
            offset={offset}
            pageSize={PAGE_SIZE}
            itemCount={contributions.data?.length ?? 0}
            noun="contributions"
            onPrevious={() =>
              setPage({ scope: pageScope, offset: Math.max(0, offset - PAGE_SIZE) })
            }
            onNext={() => setPage({ scope: pageScope, offset: offset + PAGE_SIZE })}
          />
        </>
      )}
    </div>
  );
}
