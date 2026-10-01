"use client";

import { useMemo } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { Table, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { listMemberships } from "@/lib/api/memberships";
import { listChamaSharesWithFallback } from "@/lib/api/shares";
import { useQuery } from "@/lib/query/hooks";
import { formatDateTime } from "@/lib/format";
import type { MembershipOut } from "@/types/api";

interface ChamaShares {
  shares: Awaited<ReturnType<typeof listChamaSharesWithFallback>>["shares"];
  source: "chama" | "per-membership";
}

/**
 * Read-only, Chama-wide share records for every member.
 *
 * Units are shown exactly as the API returned them. We deliberately do not
 * convert them to money here: `share_unit_price` is server-side configuration
 * that the API never returns, so any value the browser computed would be a
 * guess. The per-member totals below are unit counts, not cash.
 */
export function GroupShares() {
  const { activeChamaId } = useChama();
  const chamaId = activeChamaId;

  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );

  const shares = useQuery<ChamaShares>(
    chamaId && memberships.data ? `${chamaId}:shares:all` : null,
    async () => {
      if (!chamaId || !memberships.data) return { shares: [], source: "chama" as const };
      return listChamaSharesWithFallback(chamaId, memberships.data);
    }
  );

  const membersById = useMemo(
    () => new Map((memberships.data ?? []).map((m) => [m.id, m])),
    [memberships.data]
  );

  const memberLabel = (membershipId: string) => {
    const membership = membersById.get(membershipId);
    if (!membership) return membershipId.slice(0, 8);
    return membership.member
      ? `${membership.member.last_name} ${membership.member.first_name} (#${membership.membership_number})`
      : `Member #${membership.membership_number}`;
  };

  // Unit counts only — never a monetary value, see the note above.
  const totals = useMemo(() => {
    const byMembership = new Map<string, { units: number; records: number }>();
    for (const share of shares.data?.shares ?? []) {
      const parsed = Number(share.units);
      const current = byMembership.get(share.membership_id) ?? { units: 0, records: 0 };
      current.units += Number.isFinite(parsed) ? parsed : 0;
      current.records += 1;
      byMembership.set(share.membership_id, current);
    }
    return [...byMembership.entries()].sort((a, b) => b[1].units - a[1].units);
  }, [shares.data]);

  if (memberships.isLoading || shares.isLoading) return <TableSkeleton rows={5} cols={4} />;
  if (shares.error) {
    return <ErrorState message={shares.error.message} onRetry={shares.refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Members with shares</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {totals.length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Share records</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {shares.data?.shares.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total units issued</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {totals.reduce((sum, [, value]) => sum + value.units, 0).toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Units, not cash — the share price is set on the server and is not exposed by the API.
          </p>
        </div>
      </div>

      {totals.length === 0 ? (
        <EmptyState
          title="No shares issued yet"
          description="Share records are created by the backend when contributions are confirmed."
        />
      ) : (
        <Table head={["Member", "Units", "Records"]}>
          {totals.map(([membershipId, value]) => (
            <tr key={membershipId}>
              <Td>{memberLabel(membershipId)}</Td>
              <Td>
                <span className="font-mono text-sm">{value.units.toFixed(2)}</span>
              </Td>
              <Td>{value.records}</Td>
            </tr>
          ))}
        </Table>
      )}

      <details className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
          All share records ({(shares.data?.shares.length ?? 0).toLocaleString()})
        </summary>
        <div className="mt-3 overflow-x-auto">
          <Table head={["Created", "Member", "Units", "Status"]}>
            {(shares.data?.shares ?? []).map((share) => (
              <tr key={share.id}>
                <Td>{formatDateTime(share.created_at)}</Td>
                <Td>{memberLabel(share.membership_id)}</Td>
                <Td>
                  <span className="font-mono text-sm">{share.units}</span>
                </Td>
                <Td>
                  <StatusBadge status={share.status} />
                </Td>
              </tr>
            ))}
          </Table>
        </div>
      </details>
    </div>
  );
}
