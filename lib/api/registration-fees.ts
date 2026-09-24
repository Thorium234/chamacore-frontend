import { api } from "@/lib/api/client";
import type { RegistrationFeeOut, RegistrationFeePaymentOut } from "@/types/api";

export async function getRegistrationFee(
  chamaId: string,
  membershipId: string
): Promise<RegistrationFeeOut> {
  const { data } = await api.get<RegistrationFeeOut>(
    `/chamas/${chamaId}/memberships/${membershipId}/registration-fee`
  );
  return data;
}

export async function waiveRegistrationFee(
  chamaId: string,
  membershipId: string
): Promise<RegistrationFeeOut> {
  const { data } = await api.post<RegistrationFeeOut>(
    `/chamas/${chamaId}/memberships/${membershipId}/registration-fee/waive`
  );
  return data;
}

export async function payRegistrationFee(
  chamaId: string,
  membershipId: string
): Promise<RegistrationFeeOut> {
  const { data } = await api.post<RegistrationFeeOut>(
    `/chamas/${chamaId}/memberships/${membershipId}/registration-fee/pay`
  );
  return data;
}

export async function reverseRegistrationFeePayment(
  chamaId: string,
  membershipId: string
): Promise<RegistrationFeeOut> {
  const { data } = await api.post<RegistrationFeeOut>(
    `/chamas/${chamaId}/memberships/${membershipId}/registration-fee/payment/reverse`
  );
  return data;
}

export async function listRegistrationFeePayments(
  chamaId: string,
  membershipId: string
): Promise<RegistrationFeePaymentOut[]> {
  const { data } = await api.get<RegistrationFeePaymentOut[]>(
    `/chamas/${chamaId}/memberships/${membershipId}/registration-fee/payments`
  );
  return data;
}