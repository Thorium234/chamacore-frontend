import { api } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { MembershipOut, ShareOut } from "@/types/api";

/** Share records for a single membership. Available on every backend build. */
export async function listShares(
  chamaId: string,
  membershipId: string
): Promise<ShareOut[]> {
  const { data } = await api.get<ShareOut[]>(
    `/chamas/${chamaId}/memberships/${membershipId}/shares`
  );
  return data;
}

/**
 * Share records for the whole Chama, readable by any active member.
 *
 * `GET /chamas/{id}/shares` is a newer backend route. If the deployed backend
 * does not have it yet this returns `null` instead of throwing, so the
 * transparency view can fall back to per-membership reads rather than showing
 * an error. Any other failure (403, network) still propagates.
 */
export async function listChamaShares(chamaId: string): Promise<ShareOut[] | null> {
  try {
    const { data } = await api.get<ShareOut[]>(`/chamas/${chamaId}/shares`);
    return data;
  } catch (err) {
    const apiError = toApiError(err);
    if (apiError.kind === "not_found" || apiError.status === 405) return null;
    throw err;
  }
}

/**
 * Chama-wide shares with a transparent fallback.
 *
 * Prefers the single group endpoint; when it is unavailable, stitches the same
 * data from the per-membership route using the roster already loaded for the
 * Chama. Rows are identical either way — only the number of requests differs.
 */
export async function listChamaSharesWithFallback(
  chamaId: string,
  memberships: MembershipOut[]
): Promise<{ shares: ShareOut[]; source: "chama" | "per-membership" }> {
  const groupWide = await listChamaShares(chamaId);
  if (groupWide) return { shares: groupWide, source: "chama" };

  const perMembership = await Promise.all(
    memberships.map((membership) => listShares(chamaId, membership.id))
  );
  return { shares: perMembership.flat(), source: "per-membership" };
}
