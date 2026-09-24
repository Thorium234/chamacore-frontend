"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { useChama } from "@/features/chamas/ChamaContext";
import { useSession } from "@/features/auth/session";
import { useMutation, useQuery } from "@/lib/query/hooks";
import { requestPayout } from "@/lib/api/payouts";
import { listMemberships } from "@/lib/api/memberships";
import { toApiError, getErrorMessage } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";
import type { MembershipOut } from "@/types/api";

export function RequestPayoutForm() {
  const { activeChamaId } = useChama();
  const { user } = useSession();
  const chamaId = activeChamaId;

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );

  const myMembership = (memberships.data ?? []).find(
    (m) => m.member_id === user?.member_id && m.status === "ACTIVE"
  );

  const { mutate, isPending, error, reset } = useMutation(
    async () => {
      if (!chamaId) throw new Error("No active Chama");
      return requestPayout(chamaId, {
        amount,
        note: note.trim() || null,
      });
    },
    { invalidates: chamaId ? [`${chamaId}:payouts`] : [] }
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || !chamaId) return;
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) return;
    const result = await mutate();
    if (result) {
      reset();
      setAmount("");
      setNote("");
    }
  }

  if (!myMembership) {
    return (
      <Alert tone="info">
        You need an active membership in this Chama before you can request a payout.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? (
        <Alert title="Could not request the payout">
          {getErrorMessage(toApiError(error))}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Amount (KES)"
          required
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="2000.00"
          hint="Cannot exceed your share value or the Chama's available cash."
        />
        <Textarea
          label="Note (optional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
        />
      </div>

      <Button type="submit" loading={isPending}>
        Request {amount ? formatMoney(amount) : "payout"}
      </Button>
    </form>
  );
}