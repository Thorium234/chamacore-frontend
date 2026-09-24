"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useChama } from "@/features/chamas/ChamaContext";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Skeleton } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery } from "@/lib/query/hooks";
import { getLedgerAccounts } from "@/lib/api/ledger";
import { formatAccountBalance } from "@/lib/format";
import { LedgerHistory } from "@/features/ledger/LedgerHistory";
import { AccountEntries } from "@/features/ledger/AccountEntries";

function LedgerViewer() {
  const { activeChamaId } = useChama();
  const chamaId = activeChamaId;
  const searchParams = useSearchParams();
  const accountId = searchParams.get("account");

  const accounts = useQuery(
    chamaId ? `${chamaId}:ledger:accounts` : null,
    async () => (chamaId ? getLedgerAccounts(chamaId) : null)
  );

  const account = accounts.data?.items.find((a) => a.id === accountId) ?? null;

  return (
    <div className="space-y-6">
      <Card
        title="Accounts & balances"
        description="Balances are signed per accounting convention; equity and revenue read as positive capital here."
      >
        {accounts.isLoading ? (
          <Skeleton className="h-24" />
        ) : accounts.error ? (
          <p className="text-sm text-red-700">{accounts.error.message}</p>
        ) : (
          <Table head={["Code", "Account", "Type", "Balance"]}>
            {(accounts.data?.items ?? []).map((acc) => (
              <tr key={acc.id}>
                <Td>
                  <span className="font-mono text-xs text-zinc-500">{acc.code}</span>
                </Td>
                <Td>
                  <Link
                    href={`/ledger?account=${encodeURIComponent(acc.id)}`}
                    className={
                      accountId === acc.id
                        ? "font-medium text-indigo-600 underline"
                        : "font-medium text-zinc-900 hover:text-indigo-600"
                    }
                  >
                    {acc.name}
                  </Link>
                </Td>
                <Td>
                  <span className="text-xs uppercase tracking-wide text-zinc-400">
                    {acc.account_type}
                  </span>
                </Td>
                <Td align="right">
                  <span className="font-mono text-sm font-semibold text-zinc-900">
                    {formatAccountBalance(acc)}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {account ? (
        <Card
          title={account.name}
          description={`${account.code} · ${account.account_type} · ledger entries`}
        >
          {chamaId && account ? <AccountEntries chamaId={chamaId} accountId={account.id} /> : null}
        </Card>
      ) : (
        <Card title="Transaction history">
          {chamaId ? <LedgerHistory chamaId={chamaId} /> : null}
        </Card>
      )}
    </div>
  );
}

export default function LedgerPage() {
  return (
    <div>
      <PageHeader
        title="Ledger"
        description="A read-only view of the official accounts, balances, and immutable transaction history."
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-56" />
          </div>
        }
      >
        <LedgerViewer />
      </Suspense>
    </div>
  );
}