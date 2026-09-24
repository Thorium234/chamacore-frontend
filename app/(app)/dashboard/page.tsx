"use client";

import Link from "next/link";

import { useChama } from "@/features/chamas/ChamaContext";
import { Card, StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import {
  ErrorState,
  TableSkeleton,
  EmptyState,
} from "@/components/ui/States";
import { useQuery } from "@/lib/query/hooks";
import { getLedgerAccounts, getLedgerHistory } from "@/lib/api/ledger";
import { listMemberships } from "@/lib/api/memberships";
import { listContributions } from "@/lib/api/contributions";
import { formatAccountBalance, formatDateTime, formatMoney, formatPeriod } from "@/lib/format";

export default function DashboardPage() {
  const { activeChamaId, activeChama } = useChama();
  const chamaId = activeChamaId;

  const accounts = useQuery(
    chamaId ? `${chamaId}:ledger:accounts` : null,
    async () => (chamaId ? getLedgerAccounts(chamaId) : null)
  );
  const memberships = useQuery(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : null)
  );
  const history = useQuery(
    chamaId ? `${chamaId}:ledger:history:5:` : null,
    async () => (chamaId ? getLedgerHistory(chamaId, { limit: 5 }) : null)
  );
  const contributions = useQuery(
    chamaId ? `${chamaId}:contributions` : null,
    async () => (chamaId ? listContributions(chamaId) : null)
  );

  const latestContributions = (contributions.data ?? []).slice(0, 5);

  return (
    <div>
      <PageHeader
        title={activeChama?.name ?? "Dashboard"}
        description="Financial overview sourced from the Chama ledger."
      />

      {accounts.error || memberships.error ? (
        <ErrorState message={accounts.error?.message ?? memberships.error?.message} onRetry={accounts.refetch} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(accounts.isLoading || accounts.data === undefined) && !accounts.error ? (
          <>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-zinc-200" />
            ))}
          </>
        ) : (
          (accounts.data?.items ?? []).map((account) => (
            <StatCard
              key={account.id}
              label={account.name}
              value={formatAccountBalance(account)}
              hint={`${account.code} · ${account.account_type.toLowerCase()}`}
            />
          ))
        )}
        {!accounts.isLoading && !accounts.error && (accounts.data?.items.length ?? 0) === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <EmptyState
              title="No ledger accounts yet"
              description="Accounts appear here once the first transaction is posted to the ledger."
            />
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card
          title="Recent transactions"
          actions={
            <Link href="/ledger" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View ledger →
            </Link>
          }
        >
          {history.isLoading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : history.error ? (
            <ErrorState message={history.error.message} onRetry={history.refetch} />
          ) : (history.data?.items.length ?? 0) === 0 ? (
            <EmptyState title="No transactions yet" description="Ledger activity will appear here." />
          ) : (
            <Table head={["Date", "Description", "Entries"]}>
              {(history.data?.items ?? []).map((tx) => {
                const isReversal = Boolean(tx.reverses_transaction_id);
                return (
                  <tr key={tx.id}>
                    <Td>{formatDateTime(tx.created_at)}</Td>
                    <Td>
                      <span className="font-medium text-zinc-900">{tx.description ?? tx.source_type}</span>
                      {isReversal ? <Badge tone="red" className="ml-2">REVERSAL</Badge> : null}
                    </Td>
                    <Td>
                      <ul className="space-y-0.5">
                        {tx.entries.map((entry) => (
                          <li key={entry.account_id} className="font-mono text-xs text-zinc-600">
                            <span className="text-zinc-900">{entry.account_name}</span>{" "}
                            {entry.debit !== "0.00" ? `DR ${formatMoney(entry.debit)}` : ""}
                            {entry.credit !== "0.00" ? `CR ${formatMoney(entry.credit)}` : ""}
                          </li>
                        ))}
                      </ul>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>

        <Card
          title="Recent contributions"
          actions={
            <Link href="/contributions" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View contributions →
            </Link>
          }
        >
          {contributions.isLoading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : contributions.error ? (
            <ErrorState message={contributions.error.message} onRetry={contributions.refetch} />
          ) : latestContributions.length === 0 ? (
            <EmptyState title="No contributions recorded yet" description="Record the first contribution to get started." />
          ) : (
            <Table head={["Period", "Amount", "Status"]}>
              {latestContributions.map((contribution) => (
                <tr key={contribution.id}>
                  <Td>{formatPeriod(contribution.period)}</Td>
                  <Td>{formatMoney(contribution.amount)}</Td>
                  <Td>
                    <Badge tone={contribution.status === "CONFIRMED" ? "green" : contribution.status === "REVERSED" ? "red" : "amber"}>
                      {contribution.status}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <StatCard
          label="Members"
          value={memberships.isLoading ? "—" : String(memberships.data?.length ?? 0)}
          hint={memberships.error ? "Unavailable right now" : "Active and inactive memberships"}
        />
      </div>
    </div>
  );
}