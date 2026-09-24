import { api } from "@/lib/api/client";
import type { AuditEventOut } from "@/types/api";

export async function listAuditEvents(chamaId: string): Promise<AuditEventOut[]> {
  const { data } = await api.get<AuditEventOut[]>(`/chamas/${chamaId}/audit-events`);
  return data;
}