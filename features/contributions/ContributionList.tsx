"use client";

import { useState } from "react";
import Link from "next/link";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { Table, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { useMutation, useQuery } from "@/lib/query/hooks";
import {
  confirmContribution,
  listContributions,
  reverseContribution,
} from "@/lib/api/contributions";
import { listMemberships } from "@/lib/api/memberships";
import { formatDateTime, formatMoney, formatPeriod, shortId } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/errors";
import type { ContributionOut, MembershipOut } from "@/types/api";

export function ContributionList() {
  const { activeChamaId } = useChama();
  const { isChair } = useMemberRoles(activeChamaId);
  const chamaId = activeChamaId;

  const [confirmTarget, setConfirmTarget] = useState<ContributionOut | null>(null);
  const [reversing, setReversing] = useState<ContributionOut | null>(null);
  const [reverseNote, setReverseNote] = useState("");
  const [reverseError, setReverseError] = useState<string | null>(null);

  const contributions = useQuery<ContributionOut[]>(
    chamaId ? `${chamaId}:contributions` : null,
    async () => (chamaId ? listContributions(chamaId) : [])
  );
  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );

  const membersById = new Map((memberships.data ?? []).map((m) => [m.id, m]));
  const memberForContribution = (c: ContributionOut) => {
    const membership = membersById.get(c.membership_id);
    const member = membership?.member
      ? `${membership.member.last_name} ${membership.member.first_name}`
      : null;
    return member ? (
      <>
        <span className="font-medium text-zinc-900">{member}</span>
        <span className="ml-2 text-xs text-zinc-400">{shortId(c.membership_id)}</span>
      </>
    ) : (
      <span className="font-medium text-zinc-900">{shortId(c.membership_id)}</span>
    );
  };

  const invalidations = chamaId
    ? [`${chamaId}:contributions`, `${chamaId}:ledger`, `${chamaId}:shares`]
    : [];

  const confirmMutation = useMutation(
    async () => {
      if (!chamaId || !confirmTarget) return;
      return confirmContribution(chamaId, confirmTarget.id);
    },
    { invalidates: invalidations }
  );

  const reverseMutation = useMutation(
    async () => {
      if (!chamaId || !reversing) return;
      return reverseContribution(chamaId, reversing.id, {
        note: reverseNote.trim() || null,
      });
    },
    { invalidates: invalidations }
  );

  return (
    <>
      {contributions.isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : contributions.error ? (
        <ErrorState message={contributions.error.message} onRetry={contributions.refetch} />
      ) : (contributions.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No contributions recorded"
          description="Record the first contribution for a period to get started."
        />
      ) : (
        <Table head={["Member", "Period", "Amount", "Status", "Recorded", isChair ? "Actions" : "Note"]}>
          {contributions.data?.map((contribution) => (
            <tr key={contribution.id}>
              <Td>{memberForContribution(contribution)}</Td>
              <Td>{formatPeriod(contribution.period)}</Td>
              <Td>{formatMoney(contribution.amount)}</Td>
              <Td>
                <StatusBadge status={contribution.status} />
              </Td>
              <Td>{formatDateTime(contribution.created_at)}</Td>
              {isChair ? (
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    {contribution.status === "PENDING" ? (
                      <Button
                        size="sm"
                        onClick={() => setConfirmTarget(contribution)}
                        loading={confirmMutation.isPending && confirmTarget?.id === contribution.id}
                      >
                        Confirm
                      </Button>
                    ) : null}
                    {contribution.status === "CONFIRMED" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setReversing(contribution)}
                        loading={reverseMutation.isPending && reversing?.id === contribution.id}
                      >
                        Reverse
                      </Button>
                    ) : null}
                    <Link
                      href={`/shares?membership=${encodeURIComponent(contribution.membership_id)}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Shares →
                    </Link>
                  </div>
                </Td>
              ) : (
                <Td>
                  {contribution.note ? (
                    <span className="truncate text-zinc-500">{contribution.note}</span>
                  ) : (
                    "—"
                  )}
                </Td>
              )}
            </tr>
          ))}
        </Table>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        title="Confirm this contribution?"
        description={
          confirmTarget
            ? `This will post ${formatMoney(confirmTarget.amount)} for the period ${formatPeriod(confirmTarget.period)} to the ledger and create share records for the member. This can still be reversed later.`
            : ""
        }
        confirmLabel="Confirm contribution"
        isPending={confirmMutation.isPending}
        error={confirmMutation.error ? getErrorMessage(confirmMutation.error) : null}
        onConfirm={async () => {
          const result = await confirmMutation.mutate();
          if (result) setConfirmTarget(null);
        }}
      />

      <Modal
        open={reversing !== null}
        onClose={() => {
          if (!reverseMutation.isPending) setReversing(null);
        }}
        title="Reverse this contribution?"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setReversing(null)}
              disabled={reverseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={reverseMutation.isPending}
              onClick={async () => {
                setReverseError(null);
                const result = await reverseMutation.mutate();
                if (result) {
                  setReversing(null);
                  setReverseNote("");
                }
              }}
            >
              Reverse contribution
            </Button>
          </>
        }
      >
        {reversing ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              {formatMoney(reversing.amount)} for period{" "}
              <strong>{formatPeriod(reversing.period)}</strong> will be reversed with an
              offsetting ledger entry.
            </p>
            <Textarea
              label="Reason (optional)"
              rows={3}
              value={reverseNote}
              onChange={(event) => setReverseNote(event.target.value)}
              placeholder="e.g. Duplicate entry, wrong amount"
            />
            {reverseError ? <Alert>{reverseError}</Alert> : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}