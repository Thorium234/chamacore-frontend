"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { useChama } from "@/features/chamas/ChamaContext";
import { useMutation, useQuery } from "@/lib/query/hooks";
import { createContribution } from "@/lib/api/contributions";
import { listMemberships } from "@/lib/api/memberships";
import { toApiError, getErrorMessage } from "@/lib/api/errors";
import { currentPeriod, inPeriod } from "@/lib/format";
import type { MembershipOut } from "@/types/api";

export function RecordContributionForm() {
  const { activeChamaId } = useChama();
  const chamaId = activeChamaId;

  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );

  const [membershipId, setMembershipId] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState(currentPeriod());
  const [note, setNote] = useState("");

  const { mutate, isPending, error, reset } = useMutation(
    async () => {
      if (!chamaId) throw new Error("No active Chama");
      return createContribution(chamaId, {
        membership_id: membershipId,
        amount,
        period,
        note: note.trim() || null,
      });
    },
    { invalidates: chamaId ? [`${chamaId}:contributions`] : [] }
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || !chamaId) return;
    if (!membershipId || !inPeriod(period)) return;
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) return;
    const result = await mutate();
    if (result) {
      reset();
      setAmount("");
      setNote("");
    }
  }

  const memberLabel = (membership: MembershipOut) =>
    membership.member
      ? `${membership.member.last_name} ${membership.member.first_name} (#${membership.membership_number})`
      : `Member #${membership.membership_number}`;

  if (memberships.isLoading) return null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? (
        <Alert title="Could not record the contribution">
          {getErrorMessage(toApiError(error))}
        </Alert>
      ) : null}

      <Select
        label="Member"
        required
        value={membershipId}
        onChange={(event) => setMembershipId(event.target.value)}
      >
        <option value="" disabled>
          Select a member…
        </option>
        {(memberships.data ?? []).map((membership) => (
          <option key={membership.id} value={membership.id}>
            {memberLabel(membership)}
          </option>
        ))}
      </Select>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Amount (KES)"
          required
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="1500.00"
        />
        <Input
          label="Period"
          required
          type="month"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          hint="Contribution period (YYYY-MM)."
        />
      </div>
      <Textarea
        label="Note (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
      />

      <Button type="submit" loading={isPending}>
        Record contribution
      </Button>
    </form>
  );
}