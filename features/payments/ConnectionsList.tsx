"use client";

import { useState } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { Table, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { useMutation, useQuery } from "@/lib/query/hooks";
import {
  deletePaymentConnection,
  disablePaymentConnection,
  listPaymentConnections,
  registerC2BUrls,
  validatePaymentConnection,
} from "@/lib/api/payments";
import { getErrorMessage } from "@/lib/api/errors";
import type { C2BRegisterUrlOut, PaymentConnectionOut } from "@/types/api";

export function ConnectionsList() {
  const { activeChamaId } = useChama();
  const chamaId = activeChamaId;

  const [deleteTarget, setDeleteTarget] = useState<PaymentConnectionOut | null>(null);
  const [c2bResult, setC2bResult] = useState<C2BRegisterUrlOut | null>(null);
  const [c2bError, setC2bError] = useState<string | null>(null);

  const connections = useQuery(
    chamaId ? `${chamaId}:payment-connections` : null,
    async () => (chamaId ? listPaymentConnections(chamaId) : [])
  );

  const invalidations = chamaId ? [`${chamaId}:payment-connections`] : [];

  const validateMutation = useMutation(
    async (connectionId: string) => {
      if (!chamaId) return;
      return validatePaymentConnection(chamaId, connectionId);
    },
    { invalidates: invalidations }
  );

  const disableMutation = useMutation(
    async (connectionId: string) => {
      if (!chamaId) return;
      return disablePaymentConnection(chamaId, connectionId);
    },
    { invalidates: invalidations }
  );

  const deleteMutation = useMutation(
    async () => {
      if (!chamaId || !deleteTarget) return;
      await deletePaymentConnection(chamaId, deleteTarget.id);
    },
    { invalidates: invalidations }
  );

  const c2bMutation = useMutation(
    async (connectionId: string) => {
      if (!chamaId) return;
      return registerC2BUrls(chamaId, connectionId);
    },
    { invalidates: invalidations }
  );

  if (connections.isLoading) return <TableSkeleton rows={3} cols={5} />;
  if (connections.error) {
    return <ErrorState message={connections.error.message} onRetry={connections.refetch} />;
  }
  if ((connections.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        title="No payment connections"
        description="Connect a Daraja or Jenga provider to accept member payments."
      />
    );
  }

  return (
    <>
      <Table head={["Provider", "Environment", "Status", "Account", "Creds", "Actions"]}>
        {connections.data?.map((connection) => (
          <tr key={connection.id}>
            <Td>
              <span className="font-medium text-zinc-900">{connection.provider_code}</span>
            </Td>
            <Td>
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                {connection.environment}
              </span>
            </Td>
            <Td>
              <StatusBadge status={connection.status} />
            </Td>
            <Td>
              <span className="font-mono text-xs text-zinc-600">
                {connection.masked_account_identifier}
              </span>
            </Td>
            <Td>
              <span className="text-xs text-zinc-400">v{connection.credential_version}</span>
            </Td>
            <Td>
              <div className="flex flex-wrap items-center gap-2">
                {connection.status !== "ACTIVE" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={validateMutation.isPending}
                    onClick={() => validateMutation.mutate(connection.id)}
                  >
                    Validate
                  </Button>
                ) : null}
                {connection.provider_code === "DARAJA" && connection.status === "ACTIVE" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={c2bMutation.isPending}
                    onClick={async () => {
                      setC2bError(null);
                      const result = await c2bMutation.mutate(connection.id);
                      if (result) setC2bResult(result);
                      else if (c2bMutation.error) setC2bError(getErrorMessage(c2bMutation.error));
                    }}
                  >
                    Register C2B URLs
                  </Button>
                ) : null}
                {connection.status === "ACTIVE" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={disableMutation.isPending}
                    onClick={() => disableMutation.mutate(connection.id)}
                  >
                    Disable
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(connection)}>
                  Delete
                </Button>
              </div>
            </Td>
          </tr>
        ))}
      </Table>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete the ${deleteTarget?.provider_code} connection?`}
        description="The credentials and connection configuration will be removed. Existing payment attempts are not affected."
        confirmLabel="Delete connection"
        tone="danger"
        isPending={deleteMutation.isPending}
        error={deleteMutation.error ? getErrorMessage(deleteMutation.error) : null}
        onConfirm={async () => {
          await deleteMutation.mutate();
          if (!deleteMutation.error) setDeleteTarget(null);
        }}
      />

      <Modal
        open={c2bResult !== null}
        onClose={() => setC2bResult(null)}
        title="C2B URL registration result"
        size="md"
      >
        {c2bError ? <Alert>{c2bError}</Alert> : null}
        {c2bResult ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={c2bResult.accepted ? "ACTIVE" : "REJECTED"} />
              <span className="text-sm text-zinc-700">{c2bResult.response_description}</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Validation URL
              </p>
              <p className="break-all font-mono text-xs text-zinc-600">{c2bResult.validation_url}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Confirmation URL
              </p>
              <p className="break-all font-mono text-xs text-zinc-600">{c2bResult.confirmation_url}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}