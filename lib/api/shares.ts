import { api } from "@/lib/api/client";
import type { ShareOut } from "@/types/api";

export async function listShares(
  chamaId: string,
  membershipId: string
): Promise<ShareOut[]> {
  const { data } = await api.get<ShareOut[]>(
    `/chamas/${chamaId}/memberships/${membershipId}/shares`
  );
  return data;
}