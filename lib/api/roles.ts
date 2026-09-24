import { api } from "@/lib/api/client";
import type { MembershipOut, RoleAssignPayload, RoleOut } from "@/types/api";

export async function listRoles(chamaId: string): Promise<RoleOut[]> {
  const { data } = await api.get<RoleOut[]>(`/chamas/${chamaId}/roles`);
  return data;
}

export async function assignRole(
  chamaId: string,
  membershipId: string,
  payload: RoleAssignPayload
): Promise<MembershipOut> {
  const { data } = await api.post<MembershipOut>(
    `/chamas/${chamaId}/memberships/${membershipId}/roles`,
    payload
  );
  return data;
}

export async function removeRole(
  chamaId: string,
  membershipId: string,
  roleName: "TREASURER" | "SECRETARY"
): Promise<MembershipOut> {
  const { data } = await api.delete<MembershipOut>(
    `/chamas/${chamaId}/memberships/${membershipId}/roles/${roleName}`
  );
  return data;
}