"use client";

import { useState, type FormEvent } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { useSession } from "@/features/auth/session";
import { Table, Td } from "@/components/ui/Table";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { useMutation, useQuery } from "@/lib/query/hooks";
import {
  approvePayout,
  completePayout,
  failPayout,
  listPayouts,
  processPayout,
  rejectPayout,
  reversePayout,
} from "@/lib/api/payouts";
import { listMemberships } from "@/lib/api/memberships";
import { toApiError, getErrorMessage } from "@/lib/api/errors";
import { formatDateTime, formatMoney, shortId } from "@/lib/format";
import type { MembershipOut, PayoutOut } from "@/types/api";

type Action = "approve" | "reject" | "process" | "complete" | "reverse" | null;

export function PayoutsList() {
  const { activeChamaId } = useChama();
  const { user } = useSession();
  const { roles, isChair } = useMemberRoles(activeChamaId);
  const chamaId = activeChamaId;
  const canHandleMoney = isChair || roles.includes("TREASURER");

  const [confirmAction, setConfirmAction] = useState<Action>(null);
  const [activePayout, setActivePayout] = useState<PayoutOut | null>(null);
  const [failDialogOpen, setFailDialogOpen] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const payouts = useQuery<PayoutOut[]>(
    chamaId ? `${chamaId}:payouts` : null,
    async () => (chamaId ? listPayouts(chamaId) : [])
  );
  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );

  const membersById = new Map((memberships.data ?? []).map((m) => [m.id, m]));
  const myMembership = (memberships.data ?? []).find(
    (m) => m.member_id === user?.member_id
  );

  const invalidations = chamaId ? [`${chamaId}:payouts`] : [];

  const mutation = useMutation(
    async () => {
      if (!chamaId || !confirmAction || !activePayout) return;
      switch (confirmAction) {
        case "approve":
          return approvePayout(chamaId, activePayout.id);
        case "reject":
          return rejectPayout(chamaId, activePayout.id);
        case "process":
          return processPayout(chamaId, activePayout.id);
        case "complete":
          return completePayout(chamaId, activePayout.id);
        case "reverse":
          return reversePayout(chamaId, activePayout.id);
        default:
          return;
      }
    },
    { invalidates: invalidations }
  );

  const failMutation = useMutation(
    async () => {
      if (!chamaId || !activePayout) return;
      const trimmed = failureReason.trim();
      if (!trimmed) throw new Error("A failure reason is required.");
      return failPayout(chamaId, activePayout.id, { failure_reason: trimmed });
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

  async function onFail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (failMutation.isPending) return;
    setActionError(null);
    const result = await failMutation.mutate();
    if (result) {
      setFailDialogOpen(false);
      setFailureReason("");
    } else if (failMutation.error) {
      setActionError(getErrorMessage(toApiError(failMutation.error)));
    }
  }

  const memberFor = (id: string) => {
    const m = membersById.get(id);
    return m?.member ? `${m.member.last_name} ${m.member.first_name}` : "—";
  };

  if (payouts.isLoading) return <TableSkeleton rows={4} cols={6} />;
  if (payouts.error) return <ErrorState message={payouts.error.message} onRetry={payouts.refetch} />;
  if ((payouts.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        title="No payout requests yet"
        description="Members can request to withdraw part of their shares. Requests land here for approval."
      />
    );
  }

  return (
    <>
      <Table
        head={["Member", "Amount", "Status", "Requested", "Decided", "Actions"]}
      >
        {payouts.data?.map((payout) => {
          const mine = myMembership?.id === payout.membership_id;
          const selfTarget = payout.membership_id === myMembership?.id;
          return (
            <tr key={payout.id}>
              <Td>
                <span className="font-medium text-zinc-900">
                  {memberFor(payout.membership_id)}
                </span>
                {mine ? <Badge tone="blue">you</Badge> : null}
              </Td>
              <Td>
                <p className="font-medium text-zinc-900">{formatMoney(payout.amount)}</p>
                <span className="font-mono text-xs text-zinc-400">
                  {shortId(payout.id)}
                </span>
              </Td>
              <Td>
                <div className="space-y-1">
                  <StatusBadge status={payout.status} />
                  {payout.status === "COMPLETED" &&
                  (payout.note || payout.completed_at) ? (
                    <div className="text-xs text-zinc-500">
                      {payout.note ? <p>{payout.note}</p> : null}
                      {payout.completed_at ? <p>~ {formatDateTime(payout.completed_at)}</p> : null}
                    </div>
                  ) : null}
                  {payout.status === "FAILED" && payout.failure_reason ? (
                    <p className="text-xs text-zinc-500">{payout.failure_reason}</p>
                  ) : null}
                </div>
              </Td>
              <Td>
                <p className="text-sm text-zinc-600">{formatDateTime(payout.requested_at)}</p>
              </Td>
              <Td>
                {payout.status === "APPROVED" ? (
                  <p className="text-xs text-zinc-500">
                    approved {formatDateTime(payout.approved_at ?? "")}
                  </p>
                ) : payout.status === "PROCESSING" ? (
                  <p className="text-xs text-zinc-500">
                    processed {formatDateTime(payout.processed_at ?? "")}
                  </p>
                ) : null}
              </Td>
              <Td>
                <div className="flex flex-wrap items-center gap-2">
                  {payout.status === "REQUESTED" && isChair && !selfTarget ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setActivePayout(payout);
                          setConfirmAction("approve");
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setActivePayout(payout);
                          setConfirmAction("reject");
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {payout.status === "APPROVED" && canHandleMoney ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setActivePayout(payout);
                        setConfirmAction("process");
                      }}
                    >
                      Process
                    </Button>
                  ) : null}
                  {payout.status === "PROCESSING" && canHandleMoney ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setActivePayout(payout);
                          setConfirmAction("complete");
                        }}
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setActivePayout(payout);
                          setFailDialogOpen(true);
                        }}
                      >
                        Fail
                      </Button>
                    </>
                  ) : null}
                  {payout.status === "COMPLETED" && isChair ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setActivePayout(payout);
                        setConfirmAction("reverse");
                      }}
                    >
                      Reverse
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
          confirmAction === "approve"
            ? "Approve this payout?"
            : confirmAction === "reject"
              ? "Reject this payout request?"
              : confirmAction === "process"
                ? "Process this payout?"
                : confirmAction === "complete"
                  ? "Complete this payout?"
                  : "Reverse this payout?"
        }
        description={
          confirmAction === "approve"
            ? `Approve the payout of ${formatMoney(activePayout?.amount ?? "0")} to ${memberFor(activePayout?.membership_id ?? "")}.`
            : confirmAction === "reject"
              ? `The request for ${formatMoney(activePayout?.amount ?? "0")} will be marked REJECTED and no money moves.`
              : confirmAction === "process"
                ? "Marking the payout PROCESSING freezes the amount while the transfer runs."
                : confirmAction === "complete"
                  ? "Completing deducts the payout from the member's share value and posts it to the ledger."
                  : "The payout will be marked REVERSED and the ledger transaction reversed. Use this only when money failed to reach the member."
        }
        confirmLabel={
          confirmAction === "approve"
            ? "Approve payout"
            : confirmAction === "reject"
              ? "Reject payout"
              : confirmAction === "process"
                ? "Process payout"
                : confirmAction === "complete"
                  ? "Complete payout"
                  : "Reverse payout"
        }
        tone={
          confirmAction === "reject" || confirmAction === "reverse"
            ? "danger"
            : "primary"
        }
        isPending={mutation.isPending}
        error={actionError}
        onConfirm={confirm}
      />

      <Modal
        open={failDialogOpen && activePayout !== null}
        onClose={() => {
          if (!failMutation.isPending) {
            setFailDialogOpen(false);
            setActivePayout(null);
          }
        }}
        title="Mark this payout as failed?"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setFailDialogOpen(false)}
              disabled={failMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="submit"
              form="fail-payout-form"
              loading={failMutation.isPending}
            >
              Fail payout
            </Button>
          </>
        }
      >
        <form id="fail-payout-form" onSubmit={onFail} className="space-y-4">
          {actionError ? <Alert>{actionError}</Alert> : null}
          <Textarea
            label="Failure reason"
            required
            value={failureReason}
            onChange={(event) => setFailureReason(event.target.value)}
            rows={3}
            placeholder="e.g. STK push failed after 3 attempts; member phone invalid"
          />
          <p className="text-xs text-zinc-500">
            The payout is marked FAILED and amounts are realised back to the member{"'"}s
            shares. The reason is recorded on the payout and in the audit trail.
          </p>
        </form>
      </Modal>
    </>
  );
}