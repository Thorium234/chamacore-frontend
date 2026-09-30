"use client";

import { useEffect, useState } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { Table, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { useQuery } from "@/lib/query/hooks";
import { refetchEntry } from "@/lib/query/cache";
import { listPaymentIntents } from "@/lib/api/payments";
import { listMemberships } from "@/lib/api/memberships";
import { formatDateTime, formatMoney, shortId } from "@/lib/format";
import { IntentAttemptsModal } from "@/features/payments/IntentAttemptsModal";
import type { MembershipOut, PaymentIntentOut } from "@/types/api";

const INTENT_REFRESH_MS = 15000;

export function IntentsList() {
  const { activeChamaId } = useChama();
  const chamaId = activeChamaId;
  const [selectedIntent, setSelectedIntent] = useState<PaymentIntentOut | null>(null);

  const intents = useQuery(
    chamaId ? `${chamaId}:payment-intents` : null,
    async () => (chamaId ? listPaymentIntents(chamaId) : [])
  );
  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );

  // While a payment is PROCESSING, quietly reload the list so a delayed STK
  // callback is reflected without a manual refresh. Stops once nothing is in
  // flight and never runs while the tab is hidden.
  useEffect(() => {
    if (!chamaId) return;
    const inFlight = (intents.data ?? []).some((intent) => intent.status === "PROCESSING");
    if (!inFlight) return;
    const interval = window.setInterval(() => {
      if (!document.hidden) refetchEntry(`${chamaId}:payment-intents`);
    }, INTENT_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [chamaId, intents.data]);

  const membersById = new Map((memberships.data ?? []).map((m) => [m.id, m]));
  const memberFor = (id: string) => {
    const m = membersById.get(id);
    return m?.member ? `${m.member.last_name} ${m.member.first_name}` : "—";
  };

  if (intents.isLoading) return <TableSkeleton rows={4} cols={5} />;
  if (intents.error) return <ErrorState message={intents.error.message} onRetry={intents.refetch} />;
  if ((intents.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        title="No payment intents yet"
        description="Members can request a payment from this Chama's connected provider."
      />
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          A payment can linger before the provider callback arrives — use Refresh
          to reconcile with the provider. PROCESSING intents reload automatically.
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => chamaId && refetchEntry(`${chamaId}:payment-intents`)}
        >
          Refresh
        </Button>
      </div>

      <Table
        head={[
          "Member",
          "Amount",
          "Purpose",
          "Status",
          "Created",
          "Idempotency key",
          "Attempts",
        ]}
      >
        {intents.data?.map((intent) => (
          <tr key={intent.id}>
            <Td>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{memberFor(intent.membership_id)}</span>
            </Td>
            <Td>{formatMoney(intent.amount)}</Td>
            <Td>
              <span className="text-xs uppercase tracking-wide text-zinc-500">{intent.purpose}</span>
            </Td>
            <Td>
              <StatusBadge status={intent.status} />
            </Td>
            <Td>{formatDateTime(intent.created_at)}</Td>
            <Td>
              <span className="font-mono text-xs text-zinc-500">
                {shortId(intent.idempotency_key)}
              </span>
            </Td>
            <Td>
              <Button size="sm" variant="secondary" onClick={() => setSelectedIntent(intent)}>
                View attempts
              </Button>
            </Td>
          </tr>
        ))}
      </Table>

      {chamaId && selectedIntent ? (
        <IntentAttemptsModal
          chamaId={chamaId}
          intent={selectedIntent}
          onClose={() => setSelectedIntent(null)}
        />
      ) : null}
    </>
  );
}