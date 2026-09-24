import { api } from "@/lib/api/client";
import type {
  C2BRegisterUrlOut,
  PaymentAttemptOut,
  PaymentConnectionCreatePayload,
  PaymentConnectionOut,
  PaymentConnectionReplacePayload,
  PaymentIntentCreatePayload,
  PaymentIntentInitiatePayload,
  PaymentIntentOut,
} from "@/types/api";

// ---- Connections (chairperson management) ----

export async function listPaymentConnections(chamaId: string): Promise<PaymentConnectionOut[]> {
  const { data } = await api.get<PaymentConnectionOut[]>(
    `/chamas/${chamaId}/payment-connections`
  );
  return data;
}

export async function createPaymentConnection(
  chamaId: string,
  payload: PaymentConnectionCreatePayload
): Promise<PaymentConnectionOut> {
  const { data } = await api.post<PaymentConnectionOut>(
    `/chamas/${chamaId}/payment-connections`,
    payload
  );
  return data;
}

export async function validatePaymentConnection(
  chamaId: string,
  connectionId: string
): Promise<PaymentConnectionOut> {
  const { data } = await api.post<PaymentConnectionOut>(
    `/chamas/${chamaId}/payment-connections/${connectionId}/validate`
  );
  return data;
}

export async function replacePaymentConnection(
  chamaId: string,
  connectionId: string,
  payload: PaymentConnectionReplacePayload
): Promise<PaymentConnectionOut> {
  const { data } = await api.patch<PaymentConnectionOut>(
    `/chamas/${chamaId}/payment-connections/${connectionId}`,
    payload
  );
  return data;
}

export async function disablePaymentConnection(
  chamaId: string,
  connectionId: string
): Promise<PaymentConnectionOut> {
  const { data } = await api.post<PaymentConnectionOut>(
    `/chamas/${chamaId}/payment-connections/${connectionId}/disable`
  );
  return data;
}

export async function registerC2BUrls(
  chamaId: string,
  connectionId: string
): Promise<C2BRegisterUrlOut> {
  const { data } = await api.post<C2BRegisterUrlOut>(
    `/chamas/${chamaId}/payment-connections/${connectionId}/register-c2b-urls`,
    { response_type: "Completed" }
  );
  return data;
}

export async function deletePaymentConnection(
  chamaId: string,
  connectionId: string
): Promise<void> {
  await api.delete(`/chamas/${chamaId}/payment-connections/${connectionId}`);
}

// ---- Intents ----

export async function listPaymentIntents(chamaId: string): Promise<PaymentIntentOut[]> {
  const { data } = await api.get<PaymentIntentOut[]>(`/chamas/${chamaId}/payment-intents`);
  return data;
}

export async function createPaymentIntent(
  chamaId: string,
  payload: PaymentIntentCreatePayload
): Promise<PaymentIntentOut> {
  const { data } = await api.post<PaymentIntentOut>(
    `/chamas/${chamaId}/payment-intents`,
    payload
  );
  return data;
}

export async function getPaymentIntent(
  chamaId: string,
  intentId: string
): Promise<PaymentIntentOut> {
  const { data } = await api.get<PaymentIntentOut>(
    `/chamas/${chamaId}/payment-intents/${intentId}`
  );
  return data;
}

export async function initiatePaymentIntent(
  chamaId: string,
  intentId: string,
  payload: PaymentIntentInitiatePayload
): Promise<PaymentAttemptOut> {
  const { data } = await api.post<PaymentAttemptOut>(
    `/chamas/${chamaId}/payment-intents/${intentId}/initiate`,
    payload
  );
  return data;
}

export async function listPaymentAttempts(
  chamaId: string,
  intentId: string
): Promise<PaymentAttemptOut[]> {
  const { data } = await api.get<PaymentAttemptOut[]>(
    `/chamas/${chamaId}/payment-intents/${intentId}/attempts`
  );
  return data;
}