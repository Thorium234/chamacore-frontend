"use client";

import { useSession } from "@/features/auth/session";
import { listMemberships } from "@/lib/api/memberships";
import { useQuery } from "@/lib/query/hooks";
import type { MembershipOut } from "@/types/api";

export interface MemberRoles {
  myMembership: MembershipOut | undefined;
  roles: string[];
  isChair: boolean;
  isLeadership: boolean;
  canRecordContributions: boolean;
}

/**
 * Derives the current user's membership/roles in a Chama from the memberships
 * list returned by the API. This is display-only guidance — the backend
 * remains the authorization layer and a 403 is always valid.
 */
export function useMemberRoles(chamaId: string | null): MemberRoles {
  const { user } = useSession();
  const query = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => {
      if (!chamaId) return [];
      return listMemberships(chamaId);
    }
  );

  const myMembership = query.data?.find(
    (membership) => membership.member_id === user?.member_id
  );
  const roles = myMembership?.roles ?? [];
  const isChair = roles.includes("CHAIRPERSON");
  const isLeadership = roles.some(
    (role) => role === "CHAIRPERSON" || role === "TREASURER" || role === "SECRETARY"
  );
  const canRecordContributions = isChair || roles.includes("TREASURER");

  return { myMembership, roles, isChair, isLeadership, canRecordContributions };
}