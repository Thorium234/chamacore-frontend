import { api } from "@/lib/api/client";
import type {
  LedgerAccountEntriesOut,
  LedgerAccountsOut,
  LedgerHistoryOut,
} from "@/types/api";

export async function getLedgerAccounts(chamaId: string): Promise<LedgerAccountsOut> {
  const { data } = await api.get<LedgerAccountsOut>(
    `/chamas/${chamaId}/ledger/accounts`
  );
  return data;
}

export async function getLedgerHistory(
  chamaId: string,
  opts?: { limit?: number; cursor?: string | null }
): Promise<LedgerHistoryOut> {
  const { data } = await api.get<LedgerHistoryOut>(`/chamas/${chamaId}/ledger`, {
    params: {
      limit: opts?.limit ?? 25,
      ...(opts?.cursor ? { cursor: opts.cursor } : {}),
    },
  });
  return data;
}

export async function getLedgerAccountEntries(
  chamaId: string,
  accountId: string,
  opts?: { limit?: number; cursor?: string | null }
): Promise<LedgerAccountEntriesOut> {
  const { data } = await api.get<LedgerAccountEntriesOut>(
    `/chamas/${chamaId}/ledger/accounts/${accountId}/entries`,
    {
      params: {
        limit: opts?.limit ?? 25,
        ...(opts?.cursor ? { cursor: opts.cursor } : {}),
      },
    }
  );
  return data;
}