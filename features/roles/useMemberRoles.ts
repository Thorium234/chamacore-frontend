"use client";

import { useSession } from "@/features/auth/session";
import { listMemberships } from "@/lib/api/memberships";
import { useQuery } from "@/lib/query/hooks";
import type { MembershipOut, RoleName } from "@/types/api";

/**
 * Capabilities the current user holds in the active Chama.
 *
 * Every entry mirrors an authorization check in the backend
 * (`app/services/access.py` + the per-service role guards). Keep this table in
 * step with the backend role matrix — it is UI guidance for hiding actions the
 * user cannot perform, never an access control. The API remains the only
 * enforcement point, and every caller still handles a 403.
 */
export interface ChamaCapabilities {
  /** ACTIVE membership exists for this user in this Chama. */
  isActiveMember: boolean;
  /** Any leadership role (chairperson, treasurer, secretary). */
  isLeadership: boolean;
  isChair: boolean;
  isTreasurer: boolean;
  isSecretary: boolean;

  /** POST /memberships — chair, treasurer, secretary. */
  canAddMembers: boolean;
  /** PATCH /memberships/{id}/status — chair only. */
  canChangeMembershipStatus: boolean;
  /** POST/DELETE /memberships/{id}/roles — chair only. */
  canAssignRoles: boolean;
  /** PATCH /chamas/{id} — chair only. */
  canEditChama: boolean;

  /** POST /contributions — chair, treasurer. */
  canRecordContributions: boolean;
  /** POST /contributions/{id}/confirm and /reverse — chair only. */
  canSettleContributions: boolean;

  /** POST /registration-fee/pay — chair, treasurer. */
  canPayRegistrationFee: boolean;
  /** POST /registration-fee/waive and /payment/reverse — chair only. */
  canWaiveRegistrationFee: boolean;
  /** POST /registration-fee/payment/reverse — chair only. */
  canReverseRegistrationFeePayment: boolean;

  /** POST /payment-connections and its lifecycle — chair only. */
  canManagePaymentConnections: boolean;

  /** POST /loans/{id}/approve, /reject, /cancel, /disburse — chair only. */
  canApproveLoans: boolean;
  /** POST /loans/{id}/repayments — chair, treasurer. */
  canRecordLoanRepayments: boolean;
  /** POST /loans/{id}/repayments/{id}/reverse — chair only. */
  canReverseLoanRepayments: boolean;

  /** POST /payouts/{id}/approve, /reject, /reverse — chair only. */
  canApprovePayouts: boolean;
  /** POST /payouts/{id}/process, /complete, /fail — chair, treasurer. */
  canProcessPayouts: boolean;
}

export interface MemberRoles {
  myMembership: MembershipOut | undefined;
  roles: RoleName[];
  capabilities: ChamaCapabilities;
  isChair: boolean;
  isLeadership: boolean;
  canRecordContributions: boolean;
  isLoading: boolean;
}

const NO_CAPABILITIES: ChamaCapabilities = {
  isActiveMember: false,
  isLeadership: false,
  isChair: false,
  isTreasurer: false,
  isSecretary: false,
  canAddMembers: false,
  canChangeMembershipStatus: false,
  canAssignRoles: false,
  canEditChama: false,
  canRecordContributions: false,
  canSettleContributions: false,
  canPayRegistrationFee: false,
  canWaiveRegistrationFee: false,
  canReverseRegistrationFeePayment: false,
  canManagePaymentConnections: false,
  canApproveLoans: false,
  canRecordLoanRepayments: false,
  canReverseLoanRepayments: false,
  canApprovePayouts: false,
  canProcessPayouts: false,
};

function buildCapabilities(roles: RoleName[], hasActiveMembership: boolean): ChamaCapabilities {
  const chair = roles.includes("CHAIRPERSON");
  const treasurer = roles.includes("TREASURER");
  const secretary = roles.includes("SECRETARY");
  const leadership = chair || treasurer || secretary;

  return {
    isActiveMember: hasActiveMembership,
    isLeadership: leadership,
    isChair: chair,
    isTreasurer: treasurer,
    isSecretary: secretary,

    canAddMembers: leadership,
    canChangeMembershipStatus: chair,
    canAssignRoles: chair,
    canEditChama: chair,

    canRecordContributions: chair || treasurer,
    canSettleContributions: chair,

    canPayRegistrationFee: chair || treasurer,
    canWaiveRegistrationFee: chair,
    canReverseRegistrationFeePayment: chair,

    canManagePaymentConnections: chair,

    canApproveLoans: chair,
    canRecordLoanRepayments: chair || treasurer,
    canReverseLoanRepayments: chair,

    canApprovePayouts: chair,
    canProcessPayouts: chair || treasurer,
  };
}

/**
 * Derives the current user's membership, roles and capabilities in a Chama from
 * the memberships list returned by the API.
 *
 * `/auth/me` carries no roles, so the memberships list matched on
 * `member_id` is the only available source — this mirrors the documented
 * resolution order in `docs/AGENTS.md`.
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
  const capabilities = myMembership
    ? buildCapabilities(roles, myMembership.status === "ACTIVE")
    : NO_CAPABILITIES;

  return {
    myMembership,
    roles,
    capabilities,
    isChair: capabilities.isChair,
    isLeadership: capabilities.isLeadership,
    canRecordContributions: capabilities.canRecordContributions,
    isLoading: query.isLoading,
  };
}
