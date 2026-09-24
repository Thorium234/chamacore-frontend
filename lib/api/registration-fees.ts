import { api } from "@/lib/api/client";
import type { RegistrationFeeOut } from "@/types/api";

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