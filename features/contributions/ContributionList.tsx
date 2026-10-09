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
  type ContributionFilters,
} from "@/lib/api/contributions";
import { listMemberships } from "@/lib/api/memberships";
import { moneyScopeKeys } from "@/lib/query/money-scope";
import { PageControls } from "@/components/ui/PageControls";
import { formatDate, formatDateTime, formatMoney, formatPeriod, shortId } from "@/lib/format";
import { getErrorMessage } from "@/lib/api/errors";
import type { ContributionOut, MembershipOut } from "@/types/api";

const PAGE_SIZE = 25;

export function ContributionList({
  filters = {},
  cacheKey,
}: {
  /** Server-side filters; the API applies them so we never filter money client-side. */
  filters?: ContributionFilters;
  /** Cache key override so each filter combination caches independently. */
  cacheKey?: string;
}) {
  const { activeChamaId } = useChama();
  const { capabilities } = useMemberRoles(activeChamaId);
  const canSettle = capabilities.canSettleContributions;
  const chamaId = activeChamaId;

  const [confirmTarget, setConfirmTarget] = useState<ContributionOut | null>(null);
  const [reversing, setReversing] = useState<ContributionOut | null>(null);
  const [reverseNote, setReverseNote] = useState("");
  const [reverseError, setReverseError] = useState<string | null>(null);
  const pageScope = JSON.stringify([
    chamaId,
    cacheKey ?? null,
    filters.membership_id ?? null,
    filters.period ?? null,
    filters.status ?? null,
  ]);
  const [page, setPage] = useState({ scope: "", offset: 0 });
  const offset = page.scope === pageScope ? page.offset : 0;

  const contributions = useQuery<ContributionOut[]>(
    chamaId ? `${cacheKey ?? `${chamaId}:contributions`}:page:${offset}` : null,
    async () =>
      chamaId
        ? listContributions(chamaId, { ...filters, limit: PAGE_SIZE, offset })
        : []
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
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{member}</span>
        <span className="ml-2 text-xs text-zinc-400">{shortId(c.membership_id)}</span>
      </>
    ) : (
      <span className="font-medium text-zinc-900 dark:text-zinc-100">{shortId(c.membership_id)}</span>
    );
  };

  // Settling a contribution moves money: refresh every money-affected view, not
  // just this list, so shares and ledger balances on screen are never stale.
  const invalidations = chamaId ? moneyScopeKeys(chamaId) : [];

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
          title={
            filters.membership_id || filters.period || filters.status
              ? "No contributions match these filters"
              : "No contributions recorded"
          }
          description={
            filters.membership_id || filters.period || filters.status
              ? "Try widening or clearing the filters above."
              : "Record the first contribution for a period to get started."
          }
        />
      ) : (
        <Table head={["Member", "Period", "Amount", "Status", "Recorded", canSettle ? "Actions" : "Note"]}>
          {contributions.data?.map((contribution) => (
            <tr key={contribution.id}>
              <Td>{memberForContribution(contribution)}</Td>
              <Td>{formatPeriod(contribution.period)}</Td>
              <Td>{formatMoney(contribution.amount)}</Td>
              <Td>
                <StatusBadge status={contribution.status} />
              </Td>
              <Td>
                <span className="block">{formatDateTime(contribution.created_at)}</span>
                {contribution.payment_date ? (
                  <span
                    className="block text-xs text-zinc-400"
                    title="Payment date recorded with the contribution"
                  >
                    paid {formatDate(contribution.payment_date)}
                  </span>
                ) : null}
              </Td>
              {canSettle ? (
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

      {!contributions.isLoading && !contributions.error ? (
        <PageControls
          offset={offset}
          pageSize={PAGE_SIZE}
          itemCount={contributions.data?.length ?? 0}
          noun="contributions"
          onPrevious={() =>
            setPage({ scope: pageScope, offset: Math.max(0, offset - PAGE_SIZE) })
          }
          onNext={() => setPage({ scope: pageScope, offset: offset + PAGE_SIZE })}
        />
      ) : null}

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
