"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { useChama } from "@/features/chamas/ChamaContext";
import { useSession } from "@/features/auth/session";
import { useMutation, useQuery } from "@/lib/query/hooks";
import { createPaymentIntent, initiatePaymentIntent, listPaymentConnections } from "@/lib/api/payments";
import { listMemberships } from "@/lib/api/memberships";
import { getErrorMessage, toApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";
import type { MembershipOut } from "@/types/api";

export function PaymentForm() {
  const { activeChamaId } = useChama();
  const { user } = useSession();
  const chamaId = activeChamaId;
  const myMemberId = user?.member_id ?? null;

  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );
  const connections = useQuery(
    chamaId ? `${chamaId}:payment-connections` : null,
    async () => (chamaId ? listPaymentConnections(chamaId) : [])
  );

  const myMemberships = (memberships.data ?? []).filter(
    (m) => m.status === "ACTIVE" && m.member_id === myMemberId
  );

  const activeConnection = (connections.data ?? []).find((c) => c.status === "ACTIVE") ?? null;

  const [membershipId, setMembershipId] = useState("");
  const [amount, setAmount] = useState("");

  // One idempotency key per logical submit action — kept stable across retries.
  const idempotencyKeyRef = useRef<string | null>(null);

  const { mutate, isPending, error, reset } = useMutation(
    async () => {
      if (!chamaId) throw new Error("No active Chama");
      if (!activeConnection) throw new Error("No active payment connection is configured yet.");
      let key = idempotencyKeyRef.current;
      if (!key) {
        key = crypto.randomUUID();
        idempotencyKeyRef.current = key;
      }
      const intent = await createPaymentIntent(chamaId, {
        membership_id: membershipId,
        amount,
        currency: "KES",
        purpose: "CONTRIBUTION",
        idempotency_key: key,
      });
      return initiatePaymentIntent(chamaId, intent.id, {
        connection_id: activeConnection.id,
      });
    },
    {
      invalidates: chamaId ? [`${chamaId}:payment-intents`] : [],
      onSuccess: () => {
        idempotencyKeyRef.current = null;
      },
    }
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || !chamaId) return;
    if (!membershipId || !/^\d+(\.\d{1,2})?$/.test(amount)) return;
    const result = await mutate();
    if (result) {
      reset();
      setAmount("");
    }
  }

  const memberLabel = (m: MembershipOut) =>
    m.member
      ? `${m.member.last_name} ${m.member.first_name} (#${m.membership_number})`
      : `Membership #${m.membership_number}`;

  const effectiveMembershipId =
    myMemberships.some((m) => m.id === membershipId) || memberships.isLoading
      ? membershipId
      : (myMemberships[0]?.id ?? "");

  return (
    <>
      {!myMemberId ? (
        <Alert tone="info">
          Your account is not linked to a member record yet, so you cannot start a payment.
          Link your phone number and government ID on the profile page first.
        </Alert>
      ) : myMemberships.length === 0 ? (
        <Alert tone="info">
          You are not an active member of this Chama, so you do not have anything to pay here.
        </Alert>
      ) : !activeConnection ? (
        <Alert tone="info">
          The chairperson has not configured an active payment connection for this Chama yet.
          Payments will be available once a Daraja (M-Pesa) connection is validated.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error ? (
            <Alert title="Could not start the payment">
              {getErrorMessage(toApiError(error))}
            </Alert>
          ) : null}

          <Select
            label="Paying as"
            required
            value={effectiveMembershipId}
            onChange={(event) => setMembershipId(event.target.value)}
          >
            <option value="" disabled>
              Select your membership…
            </option>
            {myMemberships.map((m) => (
              <option key={m.id} value={m.id}>
                {memberLabel(m)}
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
            <Input label="Purpose" value="CONTRIBUTION" disabled hint="Contribution to this Chama." />
          </div>

          <p className="text-xs text-zinc-500">
            Paying via <strong>{activeConnection.provider_code}</strong> to{" "}
            <strong>{activeConnection.masked_account_identifier}</strong>. An M-Pesa STK push
            will be sent to your registered phone number.
          </p>

          <Button type="submit" loading={isPending}>
            Pay {amount ? formatMoney(amount) : "your contribution"}
          </Button>
        </form>
      )}
    </>
  );
}