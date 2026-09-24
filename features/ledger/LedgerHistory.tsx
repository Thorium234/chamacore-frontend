"use client";

import { Button } from "@/components/ui/Button";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { useCursorPager } from "@/features/ledger/useCursorPager";
import { getLedgerHistory } from "@/lib/api/ledger";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { LedgerTransactionOut } from "@/types/api";

function sourceTone(sourceType: string) {
  switch (sourceType) {
    case "CONTRIBUTION":
      return "blue";
    case "CONTRIBUTION_REVERSAL":
      return "red";
    case "SHARE_CAPITAL":
      return "indigo";
    case "SHARE_REVERSAL":
      return "red";
    case "PAYMENT":
      return "green";
    default:
      return "gray";
  }
}

export function LedgerHistory({ chamaId }: { chamaId: string }) {
  const pager = useCursorPager<LedgerTransactionOut>({
    key: `${chamaId}:ledger:history:25`,
    fetchPage: (cursor) => getLedgerHistory(chamaId, { limit: 25, cursor }),
  });

  if (pager.isLoading && pager.items.length === 0) return <TableSkeleton rows={5} cols={4} />;
  if (pager.error) {
    return <ErrorState message={pager.error.message} onRetry={pager.refetch} />;
  }
  if (pager.items.length === 0) {
    return (
      <EmptyState
        title="No transactions yet"
        description="The ledger is written by the backend when contributions are confirmed, shares post, or payments settle."
      />
    );
  }

  return (
    <div>
      <Table head={["Date", "Source", "Description", "Entries"]}>
        {pager.items.map((tx) => (
          <tr key={tx.id}>
            <Td>{formatDateTime(tx.created_at)}</Td>
            <Td>
              <Badge tone={sourceTone(tx.source_type)}>{tx.source_type}</Badge>
              {tx.reverses_transaction_id ? (
                <Badge tone="red" className="ml-2">
                  REVERSAL
                </Badge>
              ) : null}
            </Td>
            <Td>
              <span className="font-medium text-zinc-900">
                {tx.description ?? tx.source_type}
              </span>
            </Td>
            <Td>
              <ul className="space-y-0.5">
                {tx.entries.map((entry) => (
                  <li key={entry.account_id} className="font-mono text-xs text-zinc-600">
                    <span className="font-sans text-zinc-900">{entry.account_name}</span>{" "}
                    {entry.debit !== "0.00" ? `DR ${formatMoney(entry.debit)}` : ""}
                    {entry.credit !== "0.00" ? `CR ${formatMoney(entry.credit)}` : ""}
                  </li>
                ))}
              </ul>
            </Td>
          </tr>
        ))}
      </Table>
      {pager.hasMore ? (
        <div className="mt-4">
          <Button
            variant="secondary"
            loading={pager.loadingMore}
            onClick={pager.loadMore}
          >
            Load more
          </Button>
          {pager.loadMoreError ? (
            <p className="mt-2 text-xs text-red-700">{pager.loadMoreError.message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}