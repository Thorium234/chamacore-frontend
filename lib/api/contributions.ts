import { api } from "@/lib/api/client";
import type {
  ContributionCreatePayload,
  ContributionOut,
  ContributionReversePayload,
  ContributionStatus,
} from "@/types/api";

/**
 * Server-side filters for the Chama contributions list.
 *
 * These map 1:1 to the backend query parameters (`membership_id`, `period`,
 * `status`, `limit`, `offset`). They are applied by the API so a Chama with a
 * long history does not ship every row to the browser — the client never
 * filters financial data it was already sent.
 *
 * Passing a filter the deployed backend does not yet support is harmless: the
 * API ignores unknown query parameters rather than rejecting the request.
 */
export interface ContributionFilters {
  membership_id?: string;
  period?: string;
  status?: ContributionStatus;
  limit?: number;
  offset?: number;
}

/** Serializes filters into a stable cache key so each filter set caches separately. */
export function contributionsKey(chamaId: string, filters: ContributionFilters): string {
  const parts: string[] = [];
  if (filters.membership_id) parts.push(`m=${filters.membership_id}`);
  if (filters.period) parts.push(`p=${filters.period}`);
  if (filters.status) parts.push(`s=${filters.status}`);
  if (filters.limit !== undefined) parts.push(`l=${filters.limit}`);
  if (filters.offset !== undefined) parts.push(`o=${filters.offset}`);
  return `${chamaId}:contributions${parts.length > 0 ? `:${parts.join("&")}` : ""}`;
}

export async function listContributions(
  chamaId: string,
  filters: ContributionFilters = {}
): Promise<ContributionOut[]> {
  const { data } = await api.get<ContributionOut[]>(`/chamas/${chamaId}/contributions`, {
    params: {
      membership_id: filters.membership_id || undefined,
      period: filters.period || undefined,
      status: filters.status || undefined,
      limit: filters.limit,
      offset: filters.offset,
    },
  });
  return data;
}

export async function createContribution(
  chamaId: string,
  payload: ContributionCreatePayload
): Promise<ContributionOut> {
  const { data } = await api.post<ContributionOut>(
    `/chamas/${chamaId}/contributions`,
    payload
  );
  return data;
}

export async function confirmContribution(
  chamaId: string,
  contributionId: string
): Promise<ContributionOut> {
  const { data } = await api.post<ContributionOut>(
    `/chamas/${chamaId}/contributions/${contributionId}/confirm`
  );
  return data;
}

export async function reverseContribution(
  chamaId: string,
  contributionId: string,
  payload: ContributionReversePayload = {}
): Promise<ContributionOut> {
  const { data } = await api.post<ContributionOut>(
    `/chamas/${chamaId}/contributions/${contributionId}/reverse`,
    payload
  );
  return data;
}
