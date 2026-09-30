import { api } from "@/lib/api/client";
import type { AuditEventOut } from "@/types/api";

export interface ListAuditEventsParams {
  limit?: number;
  offset?: number;
}

export async function listAuditEvents(
  chamaId: string,
  params: ListAuditEventsParams = {}
): Promise<AuditEventOut[]> {
  const { data } = await api.get<AuditEventOut[]>(`/chamas/${chamaId}/audit-events`, {
    params,
  });
  return data;
}