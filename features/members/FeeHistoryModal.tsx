"use client";

import { useQuery } from "@/lib/query/hooks";
import { listRegistrationFeePayments } from "@/lib/api/registration-fees";
import { Table, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { formatDateTime, formatMoney, shortId } from "@/lib/format";
import type { MembershipOut } from "@/types/api";

export function FeeHistoryModal({
  chamaId,
  membership,
  onClose,
}: {
  chamaId: string;
  membership: MembershipOut;
  onClose: () => void;
}) {
  const key = `${chamaId}:memberships:${membership.id}:registration-fee-payments`;
  const payments = useQuery(key, () => listRegistrationFeePayments(chamaId, membership.id));

  const fee = membership.registration_fee;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Registration fee history — ${membership.member ? `${membership.member.first_name} ${membership.member.last_name}` : `#${membership.membership_number}`}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" onClick={payments.refetch}>
            Refresh
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {fee ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Fee of {formatMoney(fee.amount)} is currently{" "}
            <StatusBadge status={fee.status} />.
          </p>
        ) : null}

        {payments.error ? (
          <ErrorState message={payments.error.message} onRetry={payments.refetch} />
        ) : payments.isLoading ? (
          <TableSkeleton rows={3} cols={4} />
        ) : (payments.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No recorded payments yet"
            description="Confirmed and reversed fee payments will appear here."
          />
        ) : (
          <Table head={["Amount", "Status", "Paid at", "Recorded by", "Note"]}>
            {payments.data?.map((payment) => (
              <tr key={payment.id}>
                <Td>{formatMoney(payment.amount)}</Td>
                <Td>
                  <StatusBadge status={payment.status} />
                </Td>
                <Td>{formatDateTime(payment.paid_at)}</Td>
                <Td>
                  <span className="font-mono text-xs text-zinc-500">
                    {shortId(payment.recorded_by_user_id)}
                  </span>
                </Td>
                <Td>{payment.note ?? "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </Modal>
  );
}