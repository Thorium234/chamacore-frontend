import { api } from "@/lib/api/client";
import type { PayoutFailPayload, PayoutOut, PayoutRequestPayload } from "@/types/api";

export async function listPayouts(chamaId: string): Promise<PayoutOut[]> {
  const { data } = await api.get<PayoutOut[]>(`/chamas/${chamaId}/payouts`);
  return data;
}

export async function requestPayout(
  chamaId: string,
  payload: PayoutRequestPayload
): Promise<PayoutOut> {
  const { data } = await api.post<PayoutOut>(`/chamas/${chamaId}/payouts`, payload);
  return data;
}

export async function approvePayout(chamaId: string, payoutId: string): Promise<PayoutOut> {
  const { data } = await api.post<PayoutOut>(`/chamas/${chamaId}/payouts/${payoutId}/approve`);
  return data;
}

export async function rejectPayout(chamaId: string, payoutId: string): Promise<PayoutOut> {
  const { data } = await api.post<PayoutOut>(`/chamas/${chamaId}/payouts/${payoutId}/reject`);
  return data;
}

export async function processPayout(chamaId: string, payoutId: string): Promise<PayoutOut> {
  const { data } = await api.post<PayoutOut>(`/chamas/${chamaId}/payouts/${payoutId}/process`);
  return data;
}

export async function completePayout(chamaId: string, payoutId: string): Promise<PayoutOut> {
  const { data } = await api.post<PayoutOut>(`/chamas/${chamaId}/payouts/${payoutId}/complete`);
  return data;
}

export async function failPayout(
  chamaId: string,
  payoutId: string,
  payload: PayoutFailPayload
): Promise<PayoutOut> {
  const { data } = await api.post<PayoutOut>(
    `/chamas/${chamaId}/payouts/${payoutId}/fail`,
    payload
  );
  return data;
}

export async function reversePayout(chamaId: string, payoutId: string): Promise<PayoutOut> {
  const { data } = await api.post<PayoutOut>(`/chamas/${chamaId}/payouts/${payoutId}/reverse`);
  return data;
}