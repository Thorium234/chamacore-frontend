"use client";

import { useMemo } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { StatCard } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { getLedgerAccounts } from "@/lib/api/ledger";
import { listMemberships } from "@/lib/api/memberships";
import { useQuery } from "@/lib/query/hooks";
import { formatAccountBalance } from "@/lib/format";
import type { MembershipOut } from "@/types/api";

/**
 * Read-only group balance summary, visible to every active member.
 *
 * Balances come straight from `GET /chamas/{id}/ledger/accounts` — the single
 * source of truth. Nothing here sums contributions or derives cash in the
 * browser; `formatAccountBalance` only changes presentation for signed
 * equity/revenue accounts.
 */
export function GroupBalances() {
  const { activeChamaId } = useChama();
  const chamaId = activeChamaId;

  const accounts = useQuery(
    chamaId ? `${chamaId}:ledger:accounts` : null,
    async () => (chamaId ? getLedgerAccounts(chamaId) : null)
  );
  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );

  const members = useMemo(
    () =>
      (memberships.data ?? []).filter(
        (membership) => membership.status === "ACTIVE"
      ).length,
    [memberships.data]
  );

  if (accounts.error) {
    return <ErrorState message={accounts.error.message} onRetry={accounts.refetch} />;
  }

  if (accounts.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  const items = accounts.data?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        title="No ledger accounts yet"
        description="Accounts appear here once the first transaction is posted to the ledger."
      />
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((account) => (
          <StatCard
            key={account.id}
            label={account.name}
            value={formatAccountBalance(account)}
            hint={`${account.code} · ${account.account_type.toLowerCase()}`}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        {members} active member{members === 1 ? "" : "s"}. Balances are reported by the ledger; this
        page never recalculates them.
      </p>
    </div>
  );
}
