"use client";

import { Button } from "@/components/ui/Button";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { useCursorPager } from "@/features/ledger/useCursorPager";
import { getLedgerAccountEntries } from "@/lib/api/ledger";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { LedgerEntryRowOut } from "@/types/api";

export function AccountEntries({ chamaId, accountId }: { chamaId: string; accountId: string }) {
  const pager = useCursorPager<LedgerEntryRowOut>({
    key: `${chamaId}:ledger:accounts:${accountId}:entries:25`,
    fetchPage: (cursor) => getLedgerAccountEntries(chamaId, accountId, { limit: 25, cursor }),
  });

  if (pager.isLoading && pager.items.length === 0) return <TableSkeleton rows={5} cols={4} />;
  if (pager.error) {
    return <ErrorState message={pager.error.message} onRetry={pager.refetch} />;
  }

  if (pager.items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        No entries posted to this account yet.
      </p>
    );
  }

  return (
    <div>
      <Table head={["Date", "Source", "Debit", "Credit"]}>
        {pager.items.map((row) => (
          <tr key={row.id}>
            <Td>{formatDateTime(row.created_at)}</Td>
            <Td>
              <Badge tone="gray">{row.source_type}</Badge>
            </Td>
            <Td>{row.debit !== "0.00" ? formatMoney(row.debit) : "—"}</Td>
            <Td>{row.credit !== "0.00" ? formatMoney(row.credit) : "—"}</Td>
          </tr>
        ))}
      </Table>
      {pager.hasMore ? (
        <div className="mt-4">
          <Button variant="secondary" loading={pager.loadingMore} onClick={pager.loadMore}>
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