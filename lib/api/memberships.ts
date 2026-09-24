import { api } from "@/lib/api/client";
import type {
  MembershipCreatePayload,
  MembershipOut,
  MembershipStatusUpdatePayload,
} from "@/types/api";

export async function listMemberships(chamaId: string): Promise<MembershipOut[]> {
  const { data } = await api.get<MembershipOut[]>(`/chamas/${chamaId}/memberships`);
  return data;
}

export async function createMembership(
  chamaId: string,
  payload: MembershipCreatePayload
): Promise<MembershipOut> {
  const { data } = await api.post<MembershipOut>(
    `/chamas/${chamaId}/memberships`,
    payload
  );
  return data;
}

export async function updateMembershipStatus(
  chamaId: string,
  membershipId: string,
  payload: MembershipStatusUpdatePayload
): Promise<MembershipOut> {
  const { data } = await api.patch<MembershipOut>(
    `/chamas/${chamaId}/memberships/${membershipId}/status`,
    payload
  );
  return data;
}