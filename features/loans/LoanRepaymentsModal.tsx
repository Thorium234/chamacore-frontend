"use client";

import { useState, type FormEvent } from "react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Table, Td } from "@/components/ui/Table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { useMutation, useQuery } from "@/lib/query/hooks";
import { listLoanRepayments, recordLoanRepayment, reverseLoanRepayment } from "@/lib/api/loans";
import { toApiError, getErrorMessage } from "@/lib/api/errors";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { LoanOut, LoanRepaymentOut } from "@/types/api";

export function LoanRepaymentsModal({
  chamaId,
  loan,
  onClose,
}: {
  chamaId: string;
  loan: LoanOut;
  onClose: () => void;
}) {
  const { roles, isChair } = useMemberRoles(chamaId);
  const canRecord = isChair || roles.includes("TREASURER");

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirmReversal, setConfirmReversal] = useState<LoanRepaymentOut | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const repayments = useQuery<LoanRepaymentOut[]>(
    `${chamaId}:loans:${loan.id}:repayments`,
    async () => listLoanRepayments(chamaId, loan.id)
  );

  const invalidations = [`${chamaId}:loans`, `${chamaId}:loans:${loan.id}:repayments`];

  const recordMutation = useMutation(
    async () => {
      if (!amount || !/^\d+(\.\d{1,2})?$/.test(amount)) {
        throw new Error("Enter a valid repayment amount.");
      }
      return recordLoanRepayment(chamaId, loan.id, {
        amount,
        note: note.trim() || null,
      });
    },
    { invalidates: invalidations }
  );

  const reverseMutation = useMutation(
    async () => {
      if (!confirmReversal) return;
      return reverseLoanRepayment(chamaId, loan.id, confirmReversal.id);
    },
    { invalidates: invalidations }
  );

  async function onRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (recordMutation.isPending) return;
    setActionError(null);
    const result = await recordMutation.mutate();
    if (result) {
      setAmount("");
      setNote("");
    } else if (recordMutation.error) {
      setActionError(getErrorMessage(toApiError(recordMutation.error)));
    }
  }

  async function confirmReverse() {
    setActionError(null);
    const result = await reverseMutation.mutate();
    if (result) setConfirmReversal(null);
    else if (reverseMutation.error) {
      setActionError(getErrorMessage(toApiError(reverseMutation.error)));
    }
  }

  return (
    <Modal
      open
      onClose={() => {
        if (!recordMutation.isPending && !reverseMutation.isPending) onClose();
      }}
      title={`Repayments · ${formatMoney(loan.principal)}`}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose} disabled={recordMutation.isPending}>
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs text-zinc-500">Principal</p>
            <p className="font-medium text-zinc-900">{formatMoney(loan.principal)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Outstanding principal</p>
            <p className="font-medium text-zinc-900">
              {formatMoney(loan.outstanding_principal)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Outstanding interest</p>
            <p className="font-medium text-zinc-900">
              {formatMoney(loan.outstanding_interest)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Status</p>
            <StatusBadge status={loan.status} />
          </div>
        </div>

        {canRecord &&
        (loan.status === "DISBURSED" || loan.status === "PARTIALLY_REPAID") ? (
          <form onSubmit={onRecord} className="space-y-3 border-t border-zinc-100 pt-4">
            <p className="text-sm font-medium text-zinc-700">Record a repayment</p>
            {actionError ? <Alert>{actionError}</Alert> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Amount (KES)"
                required
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="1000.00"
                hint="Cannot exceed the outstanding balance."
              />
              <Textarea
                label="Note (optional)"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
              />
            </div>
            <Button type="submit" loading={recordMutation.isPending}>
              Record repayment
            </Button>
          </form>
        ) : canRecord ? (
          <Alert tone="info">
            Only a disbursed loan can receive repayments.
          </Alert>
        ) : (
          <Alert tone="info">
            Only the chairperson and treasurer can record repayments.
          </Alert>
        )}

        <div className="border-t border-zinc-100 pt-4">
          <p className="mb-3 text-sm font-medium text-zinc-700">Repayment history</p>
          {repayments.isLoading ? (
            <TableSkeleton rows={3} cols={4} />
          ) : repayments.error ? (
            <ErrorState message={repayments.error.message} onRetry={repayments.refetch} />
          ) : (repayments.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No repayments yet"
              description="Recorded repayments will appear here."
            />
          ) : (
            <Table head={["Recorded", "Amount", "Principal / Interest", "Status", ""]}>
              {repayments.data?.map((repayment) => (
                <tr key={repayment.id}>
                  <Td>{formatDateTime(repayment.recorded_at)}</Td>
                  <Td>{formatMoney(repayment.amount)}</Td>
                  <Td>
                    <span className="text-xs text-zinc-500">
                      {formatMoney(repayment.principal_portion)} /{" "}
                      {formatMoney(repayment.interest_portion)}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={repayment.status} />
                  </Td>
                  <Td align="right">
                    {isChair && repayment.status === "CONFIRMED" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setConfirmReversal(repayment)}
                      >
                        Reverse
                      </Button>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <Modal
          open={confirmReversal !== null}
          onClose={() => {
            if (!reverseMutation.isPending) setConfirmReversal(null);
          }}
          title="Reverse this repayment?"
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setConfirmReversal(null)}
                disabled={reverseMutation.isPending}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmReverse} loading={reverseMutation.isPending}>
                Reverse repayment
              </Button>
            </>
          }
        >
          <p className="text-sm text-zinc-600">
            The ledger transaction for this repayment will be reversed and the repayment
            marked REVERSED. The loan balance returns to its previous value.
          </p>
          {confirmReversal ? (
            <p className="mt-3 text-sm">
              <Badge tone="amber">{formatMoney(confirmReversal.amount)}</Badge>{" "}
              recorded {formatDateTime(confirmReversal.recorded_at)}
            </p>
          ) : null}
          {reverseMutation.error ? (
            <Alert className="mt-3">
              {getErrorMessage(toApiError(reverseMutation.error))}
            </Alert>
          ) : null}
        </Modal>
      </div>
    </Modal>
  );
}