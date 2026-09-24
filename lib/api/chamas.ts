import { api } from "@/lib/api/client";
import type { ChamaCreatePayload, ChamaOut, ChamaUpdatePayload } from "@/types/api";

export async function createChama(payload: ChamaCreatePayload): Promise<ChamaOut> {
  const { data } = await api.post<ChamaOut>("/chamas", payload);
  return data;
}

export async function getChama(chamaId: string): Promise<ChamaOut> {
  const { data } = await api.get<ChamaOut>(`/chamas/${chamaId}`);
  return data;
}

export async function updateChama(
  chamaId: string,
  payload: ChamaUpdatePayload
): Promise<ChamaOut> {
  const { data } = await api.patch<ChamaOut>(`/chamas/${chamaId}`, payload);
  return data;
}