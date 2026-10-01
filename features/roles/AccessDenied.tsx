"use client";

import type { ReactNode } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles, type ChamaCapabilities } from "@/features/roles/useMemberRoles";

const CHAIR = "the chairperson";
const TREASURER = "the treasurer";
const SECRETARY = "the secretary";

/**
 * Who the backend actually requires for each capability.
 *
 * Used to explain a refusal truthfully instead of guessing. The API's own 403
 * message always wins; this only covers the case where we hide an action before
 * a request is ever made.
 */
const CAPABILITY_REQUIREMENT: Record<keyof ChamaCapabilities, string | null> = {
  isActiveMember: null,
  isLeadership: null,
  isChair: CHAIR,
  isTreasurer: TREASURER,
  isSecretary: SECRETARY,
  canAddMembers: `${CHAIR}, ${TREASURER}, or ${SECRETARY}`,
  canChangeMembershipStatus: CHAIR,
  canAssignRoles: CHAIR,
  canEditChama: CHAIR,
  canRecordContributions: `${CHAIR} or ${TREASURER}`,
  canSettleContributions: CHAIR,
  canPayRegistrationFee: `${CHAIR} or ${TREASURER}`,
  canWaiveRegistrationFee: CHAIR,
  canReverseRegistrationFeePayment: CHAIR,
  canManagePaymentConnections: CHAIR,
  canApproveLoans: CHAIR,
  canRecordLoanRepayments: `${CHAIR} or ${TREASURER}`,
  canReverseLoanRepayments: CHAIR,
  canApprovePayouts: CHAIR,
  canProcessPayouts: `${CHAIR} or ${TREASURER}`,
};

/**
 * Shown when the API answers 403, or when the caller's roles cannot perform the
 * action. Explains the actual requirement instead of showing a bare error: the
 * backend message is authoritative, so we surface the role that is missing rather
 * than inventing one.
 */
export function AccessDenied({
  title = "You do not have permission to do this",
  message,
  requirement,
  children,
}: {
  title?: string;
  message?: string;
  /** Who holds the capability, e.g. "only the chairperson". */
  requirement?: string | null;
  children?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center dark:border-amber-900 dark:bg-amber-950"
    >
      <p className="font-medium text-amber-900 dark:text-amber-100">{title}</p>
      {message ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-amber-800 dark:text-amber-200">{message}</p>
      ) : null}
      <p className="mx-auto mt-2 max-w-md text-xs text-amber-700 dark:text-amber-300">
        {requirement
          ? `This action is restricted to ${requirement} in this Chama.`
          : "You do not have the required role in this Chama."}{" "}
        If that should be you, ask the chairperson to update your roles.
      </p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

/**
 * Route-level capability guard for Chama pages.
 *
 * The backend is still the enforcement point — this only avoids rendering an
 * action the caller provably cannot perform, and explains why. It waits for the
 * memberships list to load first so a slow response never flashes a false
 * "no permission" panel.
 */
export function RequireCapability({
  requires,
  children,
  title,
  message,
}: {
  requires: keyof ChamaCapabilities;
  children: ReactNode;
  title?: string;
  message?: string;
}) {
  const { activeChamaId } = useChama();
  const { capabilities, isLoading } = useMemberRoles(activeChamaId);

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Checking your permissions…
      </div>
    );
  }

  if (capabilities[requires]) return <>{children}</>;

  return (
    <AccessDenied
      title={title}
      message={message}
      requirement={CAPABILITY_REQUIREMENT[requires]}
    />
  );
}
