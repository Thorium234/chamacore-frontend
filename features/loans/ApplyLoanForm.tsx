"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { useChama } from "@/features/chamas/ChamaContext";
import { useSession } from "@/features/auth/session";
import { useMutation, useQuery } from "@/lib/query/hooks";
import { applyForLoan } from "@/lib/api/loans";
import { listMemberships } from "@/lib/api/memberships";
import { toApiError, getErrorMessage } from "@/lib/api/errors";
import type { MembershipOut } from "@/types/api";

const TERM_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function ApplyLoanForm() {
  const { activeChamaId } = useChama();
  const { user } = useSession();
  const chamaId = activeChamaId;

  const [principal, setPrincipal] = useState("");
  const [termMonths, setTermMonths] = useState("12");
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
      return applyForLoan(chamaId, {
        principal,
        term_months: Number(termMonths),
        note: note.trim() || null,
      });
    },
    { invalidates: chamaId ? [`${chamaId}:loans`] : [] }
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || !chamaId) return;
    if (!/^\d+(\.\d{1,2})?$/.test(principal) || Number(principal) <= 0) return;
    const term = Number(termMonths);
    if (!Number.isInteger(term) || term < 3 || term > 12) return;
    const result = await mutate();
    if (result) {
      reset();
      setPrincipal("");
      setNote("");
    }
  }

  if (!myMembership) {
    return (
      <Alert tone="info">
        You need an active membership in this Chama before you can apply for a loan.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? (
        <Alert title="Could not apply for a loan">
          {getErrorMessage(toApiError(error))}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Principal (KES)"
          required
          inputMode="decimal"
          value={principal}
          onChange={(event) => setPrincipal(event.target.value)}
          placeholder="5000.00"
          hint="Interest and repayable amounts are set by the backend."
        />
        <Select
          label="Term"
          required
          value={termMonths}
          onChange={(event) => setTermMonths(event.target.value)}
          hint="Monthly repayment term (3–12 months)."
        >
          {TERM_OPTIONS.map((months) => (
            <option key={months} value={months}>
              {months} months
            </option>
          ))}
        </Select>
      </div>
      <Textarea
        label="Note (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
      />

      <Button type="submit" loading={isPending}>
        Apply for loan
      </Button>
    </form>
  );
}