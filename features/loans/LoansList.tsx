"use client";

import { useState } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { useSession } from "@/features/auth/session";
import { Table, Td } from "@/components/ui/Table";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { useMutation, useQuery } from "@/lib/query/hooks";
import {
  approveLoan,
  cancelLoan,
  disburseLoan,
  listLoans,
  rejectLoan,
  submitLoan,
} from "@/lib/api/loans";
import { listMemberships } from "@/lib/api/memberships";
import { toApiError, getErrorMessage } from "@/lib/api/errors";
import { formatDateTime, formatMoney, shortId } from "@/lib/format";
import { LoanRepaymentsModal } from "@/features/loans/LoanRepaymentsModal";
import type { LoanOut, MembershipOut } from "@/types/api";

type Action =
  | "submit"
  | "approve"
  | "reject"
  | "cancel"
  | "disburse"
  | null;

export function LoansList() {
  const { activeChamaId } = useChama();
  const { user } = useSession();
  const { roles, isChair } = useMemberRoles(activeChamaId);
  const chamaId = activeChamaId;
  const canManageRepayments = isChair || roles.includes("TREASURER");

  const [confirmAction, setConfirmAction] = useState<Action>(null);
  const [activeLoan, setActiveLoan] = useState<LoanOut | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loans = useQuery<LoanOut[]>(
    chamaId ? `${chamaId}:loans` : null,
    async () => (chamaId ? listLoans(chamaId) : [])
  );
  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );

  const membersById = new Map((memberships.data ?? []).map((m) => [m.id, m]));
  const myMembership = (memberships.data ?? []).find(
    (m) => m.member_id === user?.member_id
  );

  const invalidations = chamaId ? [`${chamaId}:loans`] : [];

  const mutation = useMutation(
    async () => {
      if (!chamaId || !confirmAction || !activeLoan) return;
      switch (confirmAction) {
        case "submit":
          return submitLoan(chamaId, activeLoan.id);
        case "approve":
          return approveLoan(chamaId, activeLoan.id);
        case "reject":
          return rejectLoan(chamaId, activeLoan.id);
        case "cancel":
          return cancelLoan(chamaId, activeLoan.id);
        case "disburse":
          return disburseLoan(chamaId, activeLoan.id);
        default:
          return;
      }
    },
    { invalidates: invalidations }
  );

  async function confirm() {
    setActionError(null);
    const result = await mutation.mutate();
    if (result) setConfirmAction(null);
    else if (mutation.error) {
      setActionError(getErrorMessage(toApiError(mutation.error)));
    }
  }

  const memberFor = (id: string) => {
    const m = membersById.get(id);
    return m?.member ? `${m.member.last_name} ${m.member.first_name}` : "—";
  };

  if (loans.isLoading) return <TableSkeleton rows={4} cols={6} />;
  if (loans.error) return <ErrorState message={loans.error.message} onRetry={loans.refetch} />;
  if ((loans.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        title="No loans yet"
        description="Members can apply for loans from the form above once they have been active for at least a month."
      />
    );
  }

  return (
    <>
      <Table
        head={[
          "Member",
          "Loan",
          "Term",
          "Outstanding",
          "Status",
          "Dates",
          "Actions",
        ]}
      >
        {loans.data?.map((loan) => {
          const isMine = myMembership?.id === loan.membership_id;
          const isSelfTarget = loan.membership_id === myMembership?.id;
          return (
            <tr key={loan.id}>
              <Td>
                <span className="font-medium text-zinc-900">{memberFor(loan.membership_id)}</span>
                {isMine ? <Badge tone="blue">you</Badge> : null}
              </Td>
              <Td>
                <p className="font-medium text-zinc-900">{formatMoney(loan.principal)}</p>
                <p className="text-xs text-zinc-500">
                  repay {formatMoney(loan.total_expected_repayment)}
                </p>
              </Td>
              <Td>
                <span className="text-sm text-zinc-600">{loan.term_months} months</span>
              </Td>
              <Td>
                <p className="text-sm text-zinc-600">
                  {formatMoney(loan.outstanding_principal)}
                </p>
                <p className="text-xs text-zinc-500">
                  + {formatMoney(loan.outstanding_interest)} interest
                </p>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <StatusBadge status={loan.status} />
                  {loan.is_overdue ? <Badge tone="red">overdue</Badge> : null}
                </div>
              </Td>
              <Td>
                <p className="text-xs text-zinc-500">
                  applied {formatDateTime(loan.application_date)}
                </p>
                {loan.disbursement_date ? (
                  <p className="text-xs text-zinc-500">
                    disbursed {formatDateTime(loan.disbursement_date)}
                  </p>
                ) : null}
                <span className="font-mono text-xs text-zinc-400">{shortId(loan.id)}</span>
              </Td>
              <Td>
                <div className="flex flex-wrap items-center gap-2">
                  {loan.status === "DRAFT" && isMine ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setActiveLoan(loan);
                        setConfirmAction("submit");
                      }}
                    >
                      Submit
                    </Button>
                  ) : null}
                  {loan.status === "SUBMITTED" && isChair && !isSelfTarget ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setActiveLoan(loan);
                          setConfirmAction("approve");
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setActiveLoan(loan);
                          setConfirmAction("reject");
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {loan.status === "APPROVED" && isChair ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setActiveLoan(loan);
                          setConfirmAction("disburse");
                        }}
                      >
                        Disburse
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setActiveLoan(loan);
                          setConfirmAction("cancel");
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : null}
                  {loan.status === "DISBURSED" || loan.status === "PARTIALLY_REPAID" ? (
                    <Button
                      size="sm"
                      variant={canManageRepayments ? "secondary" : "ghost"}
                      onClick={() => setActiveLoan(loan)}
                    >
                      {canManageRepayments ? "Repayments" : "View"}
                    </Button>
                  ) : null}
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>

      <ConfirmDialog
        open={confirmAction !== null}
        onClose={() => {
          if (!mutation.isPending) setConfirmAction(null);
        }}
        title={
          confirmAction === "submit"
            ? "Submit this loan application?"
            : confirmAction === "approve"
              ? "Approve this loan?"
              : confirmAction === "reject"
                ? "Reject this loan application?"
                : confirmAction === "cancel"
                  ? "Cancel this approved loan?"
                  : "Disburse this loan?"
        }
        description={
          confirmAction === "submit"
            ? "Your loan moves to SUBMITTED for the chairperson to review."
            : confirmAction === "approve"
              ? `The loan of ${formatMoney(activeLoan?.principal ?? "0")} will be marked APPROVED and can then be disbursed.`
              : confirmAction === "reject"
                ? `The application for ${formatMoney(activeLoan?.principal ?? "0")} will be marked REJECTED.`
                : confirmAction === "cancel"
                  ? "The approved loan will be cancelled and cannot be disbursed."
                  : "Disbursing posts the loan to the ledger and reduces available Chama cash. A retry after success is safe (idempotent)."
        }
        confirmLabel={
          confirmAction === "submit"
            ? "Submit application"
            : confirmAction === "approve"
              ? "Approve loan"
              : confirmAction === "reject"
                ? "Reject loan"
                : confirmAction === "cancel"
                  ? "Cancel loan"
                  : "Disburse loan"
        }
        tone={
          confirmAction === "reject" || confirmAction === "cancel"
            ? "danger"
            : "primary"
        }
        isPending={mutation.isPending}
        error={actionError}
        onConfirm={confirm}
      />

      {chamaId && activeLoan ? (
        <LoanRepaymentsModal
          chamaId={chamaId}
          loan={activeLoan}
          onClose={() => setActiveLoan(null)}
        />
      ) : null}
    </>
  );
}