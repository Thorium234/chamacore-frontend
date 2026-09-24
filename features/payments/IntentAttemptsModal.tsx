"use client";

import { useQuery } from "@/lib/query/hooks";
import { listPaymentAttempts } from "@/lib/api/payments";
import { Table, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { formatDateTime, formatMoney, shortId } from "@/lib/format";
import type { PaymentIntentOut } from "@/types/api";

export function IntentAttemptsModal({
  chamaId,
  intent,
  onClose,
}: {
  chamaId: string;
  intent: PaymentIntentOut;
  onClose: () => void;
}) {
  const key = `${chamaId}:payment-intents:${intent.id}:attempts`;
  const attempts = useQuery(key, () => listPaymentAttempts(chamaId, intent.id));

  return (
    <Modal
      open
      onClose={onClose}
      title={`Payment attempts — ${formatMoney(intent.amount)} ${intent.purpose}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" onClick={attempts.refetch}>
            Refresh
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          <StatusBadge status={intent.status} />
          <span className="font-mono text-xs text-zinc-500">
            key {shortId(intent.idempotency_key)}
          </span>
        </div>

        {attempts.error ? (
          <ErrorState message={attempts.error.message} onRetry={attempts.refetch} />
        ) : attempts.isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : (attempts.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No provider attempts yet"
            description="When this intent is initiated, the provider request and its result will appear here."
          />
        ) : (
          <Table head={["#", "Status", "Requested", "Completed", "Provider txn", "Failure"]}>
            {attempts.data?.map((attempt) => (
              <tr key={attempt.id}>
                <Td>
                  <span className="font-medium text-zinc-900">{attempt.attempt_number}</span>
                </Td>
                <Td>
                  <StatusBadge status={attempt.status} />
                  {attempt.retryable ? (
                    <span className="ml-2 text-xs text-zinc-400">retryable</span>
                  ) : null}
                </Td>
                <Td>{formatDateTime(attempt.requested_at)}</Td>
                <Td>{attempt.completed_at ? formatDateTime(attempt.completed_at) : "—"}</Td>
                <Td>
                  <span className="font-mono text-xs text-zinc-500">
                    {attempt.provider_transaction_id
                      ? shortId(attempt.provider_transaction_id)
                      : attempt.provider_request_id
                        ? `${shortId(attempt.provider_request_id)} (req)`
                        : "—"}
                  </span>
                </Td>
                <Td>
                  {attempt.status === "FAILED" || attempt.status === "TIMEOUT" ? (
                    <Alert tone="error" className="p-2 text-xs">
                      {attempt.failure_code ? <p>{attempt.failure_code}</p> : null}
                      {attempt.failure_message_safe ? (
                        <p>{attempt.failure_message_safe}</p>
                      ) : null}
                    </Alert>
                  ) : (
                    "—"
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </Modal>
  );
}