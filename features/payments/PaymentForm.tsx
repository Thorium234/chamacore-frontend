"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Alert } from "@/components/ui/Alert";
import { useChama } from "@/features/chamas/ChamaContext";
import { useSession } from "@/features/auth/session";
import { useMutation, useQuery } from "@/lib/query/hooks";
import { refetchEntry } from "@/lib/query/cache";
import { moneyScopeKeys } from "@/lib/query/money-scope";
import { createPaymentIntent, initiatePaymentIntent, listPaymentConnections } from "@/lib/api/payments";
import { listMemberships } from "@/lib/api/memberships";
import { getErrorMessage, toApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";
import { isLikelyKenyanPhone, normalizePhone, formatPhone } from "@/lib/phone";
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
  const [payerPhone, setPayerPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pushedAmount, setPushedAmount] = useState<string | null>(null);
  const [pushedPhone, setPushedPhone] = useState<string | null>(null);

  // One idempotency key per logical submit action — kept stable across retries.
  const idempotencyKeyRef = useRef<string | null>(null);

  const { mutate, isPending, error, reset } = useMutation(
    async (input: { membershipId: string; phoneNumber: string | null }) => {
      if (!chamaId) throw new Error("No active Chama");
      if (!activeConnection) throw new Error("No active payment connection is configured yet.");
      let key = idempotencyKeyRef.current;
      if (!key) {
        key = crypto.randomUUID();
        idempotencyKeyRef.current = key;
      }
      const intent = await createPaymentIntent(chamaId, {
        membership_id: input.membershipId,
        amount,
        currency: "KES",
        purpose: "CONTRIBUTION",
        idempotency_key: key,
        // Omitted charges the member's registered number; the backend falls back
        // to it when this is null (`app/services/payment_intent.py`).
        phone_number: input.phoneNumber,
      });
      return initiatePaymentIntent(chamaId, intent.id, {
        connection_id: activeConnection.id,
      });
    },
    {
      // An STK push does not settle the contribution by itself — the provider
      // callback does. Refresh every money-affected view so nothing on screen
      // claims a balance the API has not actually settled.
      invalidates: chamaId ? moneyScopeKeys(chamaId) : [],
      onSuccess: () => {
        idempotencyKeyRef.current = null;
        setPushedAmount(amount);
        setPushedPhone(payerPhone.trim() ? normalizePhone(payerPhone) : null);
      },
    }
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || !chamaId) return;

    setPushedAmount(null);

    const resolvedMembershipId =
      myMemberships.some((m) => m.id === membershipId)
        ? membershipId
        : (myMemberships[0]?.id ?? "");

    if (!resolvedMembershipId) {
      setFormError("Select the membership you are paying as first.");
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setFormError("Enter a valid amount in KES, e.g. 1500 or 1500.00.");
      return;
    }
    // An alternate payer is optional, but a malformed one is rejected by the
    // API with a PHONE_FORMAT failure code, so catch it before the push.
    const trimmedPhone = payerPhone.trim();
    if (trimmedPhone && !isLikelyKenyanPhone(trimmedPhone)) {
      setFormError("Enter a valid Kenyan phone number, or leave it empty to use your own.");
      return;
    }
    setFormError(null);

    const result = await mutate({
      membershipId: resolvedMembershipId,
      phoneNumber: trimmedPhone ? trimmedPhone : null,
    });
    if (result) {
      reset();
      setAmount("");
      setPayerPhone("");
    } else if (chamaId) {
      // The failure may be a network loss after the provider accepted the push.
      // Reload intent state so the user sees what actually happened before
      // trying again — a retry reuses the same idempotency key, so a duplicate
      // is rejected safely.
      refetchEntry(`${chamaId}:payment-intents`);
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

  // Double-submit protection plus real validity: never let a request be created
  // with a blank membership or a non-numeric amount.
  const amountIsValid = /^\d+(\.\d{1,2})?$/.test(amount) && Number(amount) > 0;
  const canSubmit = Boolean(effectiveMembershipId) && amountIsValid && !isPending;

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
              <p>{getErrorMessage(toApiError(error))}</p>
              <p className="mt-1">
                The provider may still process the request. Open “Payment
                intents” and use Refresh to reconcile before initiating again —
                a retry reuses the same idempotency key, so a duplicate is
                rejected safely.
              </p>
            </Alert>
          ) : pushedAmount ? (
            <Alert tone="success" title="Payment request sent">
              <p>
                We pushed an M-Pesa request for{" "}
                <strong>{formatMoney(pushedAmount)}</strong> to{" "}
                <strong>
                  {pushedPhone ? formatPhone(pushedPhone) : "your registered phone number"}
                </strong>
                .
              </p>
              <p className="mt-1">
                Your contribution and shares update only after M-Pesa confirms
                the payment, usually within seconds. Until then the contribution
                stays <strong>PENDING</strong> — this is normal, not a failure.
                Use Refresh on “Payment intents” to check the outcome.
              </p>
            </Alert>
          ) : formError ? (
            <Alert title="Check the payment details">
              {formError}
            </Alert>
          ) : null}

          <Select
            label="Paying as"
            required
            value={effectiveMembershipId}
            onChange={(event) => {
              setMembershipId(event.target.value);
              setFormError(null);
            }}
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
              onChange={(event) => {
                setAmount(event.target.value);
                setFormError(null);
              }}
              placeholder="1500.00"
            />
            <Input label="Purpose" value="CONTRIBUTION" disabled hint="Contribution to this Chama." />
          </div>

          <PhoneInput
            label="Pay from a different number (optional)"
            value={payerPhone}
            onChange={setPayerPhone}
            hint="Leave empty to charge the number on your member record. This does not change whose contribution is credited — that stays your membership."
          />

          <p className="text-xs text-zinc-500">
            Paying via <strong>{activeConnection.provider_code}</strong> to{" "}
            <strong>{activeConnection.masked_account_identifier}</strong>. An M-Pesa STK push
            will be sent to{" "}
            {payerPhone.trim() ? "the number you entered" : "your registered phone number"}.
          </p>

          <Button type="submit" loading={isPending} disabled={!canSubmit}>
            Pay {amount ? formatMoney(amount) : "your contribution"}
          </Button>
          {!amountIsValid && amount.length > 0 ? (
            <p className="text-xs text-zinc-500">
              Enter a positive amount with up to two decimals, e.g. 1500.00.
            </p>
          ) : null}
        </form>
      )}
    </>
  );
}