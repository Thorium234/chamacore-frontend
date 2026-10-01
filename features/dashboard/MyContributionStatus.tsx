"use client";

import { useMemo } from "react";
import Link from "next/link";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Table, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { listContributions } from "@/lib/api/contributions";
import { listPaymentIntents } from "@/lib/api/payments";
import { useQuery } from "@/lib/query/hooks";
import { currentPeriod, formatDateTime, formatMoney, formatPeriod } from "@/lib/format";
import type { ContributionOut, PaymentIntentOut } from "@/types/api";

/**
 * "Where is my money?" — the answer to the product problem behind workstream F0:
 * a payment can look successful while the contribution is still unsettled.
 *
 * Both facts are read from the API and compared here. We never infer that money
 * arrived; this panel only reports the two states the backend gave us and
 * explains the gap between them.
 */
export function MyContributionStatus() {
  const { activeChamaId } = useChama();
  const { myMembership, isLoading: rolesLoading } = useMemberRoles(activeChamaId);
  const chamaId = activeChamaId;
  const membershipId = myMembership?.id ?? null;
  const period = currentPeriod();

  const contributions = useQuery<ContributionOut[]>(
    chamaId && membershipId ? `${chamaId}:contributions:mine:${membershipId}` : null,
    async () =>
      chamaId && membershipId
        ? listContributions(chamaId, { membership_id: membershipId, limit: 25 })
        : []
  );

  const intents = useQuery<PaymentIntentOut[]>(
    chamaId && membershipId ? `${chamaId}:payment-intents` : null,
    async () => (chamaId ? listPaymentIntents(chamaId) : [])
  );

  /**
   * The `membership_id` query filter is a newer backend addition. An older build
   * ignores it and returns the whole Chama's contributions — showing those under
   * "my" status would leak other members' rows. Detect that (any row with a
   * foreign membership_id means the filter was ignored) and narrow locally.
   */
  const mine = useMemo(() => {
    const rows = contributions.data ?? [];
    if (!membershipId) return [];
    const serverHonouredFilter = rows.every(
      (row) => row.membership_id === membershipId
    );
    return serverHonouredFilter
      ? rows
      : rows.filter((row) => row.membership_id === membershipId);
  }, [contributions.data, membershipId]);

  const myIntents = useMemo(
    () =>
      (intents.data ?? []).filter(
        (intent) => intent.membership_id === membershipId
      ),
    [intents.data, membershipId],
  );

  const thisPeriod = useMemo(
    () => mine.find((contribution) => contribution.period === period) ?? null,
    [mine, period]
  );

  const latestConfirmed = useMemo(
    () => mine.find((contribution) => contribution.status === "CONFIRMED") ?? null,
    [mine]
  );

  const latestSucceeded = useMemo(
    () =>
      [...myIntents]
        .filter((intent) => intent.status === "SUCCEEDED")
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null,
    [myIntents]
  );

  const hasPaymentInFlight = myIntents.some(
    (intent) => intent.status === "PROCESSING" || intent.status === "PENDING"
  );

  // The exact confusing state this widget exists for: the provider confirmed the
  // payment, but no confirmed contribution exists for the current period yet.
  const awaitingSettlement =
    latestSucceeded !== null && (!thisPeriod || thisPeriod.status === "PENDING");

  if (rolesLoading || contributions.isLoading) return <TableSkeleton rows={3} cols={3} />;

  if (!membershipId) {
    return (
      <EmptyState
        title="No membership in this Chama"
        description="Contribution status appears once you are an active member."
      />
    );
  }

  if (contributions.error) {
    return <ErrorState message={contributions.error.message} onRetry={contributions.refetch} />;
  }

  const recent = mine.slice(0, 6);

  return (
    <div className="space-y-4">
      {awaitingSettlement && latestSucceeded ? (
        <Alert tone="info" title="Payment received — settling">
          <p>
            Your M-Pesa payment of{" "}
            <strong>{formatMoney(latestSucceeded.amount)}</strong> was confirmed{" "}
            {formatDateTime(latestSucceeded.updated_at)}.
          </p>
          <p className="mt-1">
            Your contribution for {formatPeriod(period)} still shows as pending. The Chama settles
            it once the provider callback is processed — usually seconds, occasionally a minute.
            Your shares and the group ledger update at that point, not before.
          </p>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatPeriod(period)}</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {thisPeriod ? formatMoney(thisPeriod.amount) : "Not recorded"}
          </p>
          <p className="mt-1">
            {thisPeriod ? (
              <StatusBadge status={thisPeriod.status} />
            ) : (
              <span className="text-xs text-zinc-500">No contribution for this period</span>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Latest confirmed</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {latestConfirmed ? formatMoney(latestConfirmed.amount) : "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {latestConfirmed
              ? formatPeriod(latestConfirmed.period)
              : "No confirmed contribution yet"}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Payment requests</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {myIntents.length}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {hasPaymentInFlight ? "One or more still processing" : "No requests in flight"}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Your recent contributions
          </h3>
          <Link
            href="/payments"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Pay now →
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            title="No contributions yet"
            description="Once leadership records your contribution it appears here."
          />
        ) : (
          <Table head={["Period", "Amount", "Status"]}>
            {recent.map((contribution) => (
              <tr key={contribution.id}>
                <Td>{formatPeriod(contribution.period)}</Td>
                <Td>{formatMoney(contribution.amount)}</Td>
                <Td>
                  <StatusBadge status={contribution.status} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}

export function MyContributionStatusCard() {
  return (
    <Card
      title="My contribution status"
      description="What you have paid and what is still settling."
      className="mb-6"
    >
      <MyContributionStatus />
    </Card>
  );
}
