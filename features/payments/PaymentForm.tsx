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
import {
  createPaymentIntent,
  initiatePaymentIntent,
  listPaymentConnections,
  listPaymentIntents,
} from "@/lib/api/payments";
import { listMemberships } from "@/lib/api/memberships";
import { getErrorMessage, toApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";
import { normalizePhone, formatPhone } from "@/lib/phone";
import type { MembershipOut, PaymentAttemptOut } from "@/types/api";

export function PaymentForm() {
  const { activeChamaId } = useChama();
  return (
    <PaymentFormForChama
      key={activeChamaId ?? "no-active-chama"}
      chamaId={activeChamaId}
    />
  );
}

function PaymentFormForChama({ chamaId }: { chamaId: string | null }) {
  const { user } = useSession();
  const myMemberId = user?.member_id ?? null;

  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );
  const connections = useQuery(
    chamaId ? `${chamaId}:payment-connections` : null,
    async () => (chamaId ? listPaymentConnections(chamaId) : [])
  );
  const intents = useQuery(
    chamaId ? `${chamaId}:payment-intents` : null,
    async () => (chamaId ? listPaymentIntents(chamaId, { limit: 100 }) : [])
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
  const [attemptStatus, setAttemptStatus] = useState<PaymentAttemptOut["status"] | null>(null);
  const [failedAttempt, setFailedAttempt] = useState<PaymentAttemptOut | null>(null);
  const [pendingIntentId, setPendingIntentId] = useState<string | null>(null);
  const [ignoredIntentIds, setIgnoredIntentIds] = useState<string[]>([]);
  const [confirmStopIntentId, setConfirmStopIntentId] = useState<string | null>(null);
  const [uncertainIntentId, setUncertainIntentId] = useState<string | null>(null);
  const [paymentFailureStage, setPaymentFailureStage] = useState<"creating" | "initiating" | null>(null);

  // One idempotency key per logical submit action — kept stable across retries.
  const idempotencyKeyRef = useRef<string | null>(null);
  const createdIntentIdRef = useRef<string | null>(null);

  const { mutate, isPending, error, reset } = useMutation(
    async (input: { membershipId: string; phoneNumber: string | null }) => {
      if (!chamaId) throw new Error("No active Chama");
      if (!activeConnection) throw new Error("No active payment connection is configured yet.");
      let key = idempotencyKeyRef.current;
      if (!key) {
        key = crypto.randomUUID();
        idempotencyKeyRef.current = key;
      }
      setPaymentFailureStage("creating");
      createdIntentIdRef.current = null;
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
      createdIntentIdRef.current = intent.id;
      setPaymentFailureStage("initiating");
      const attempt = await initiatePaymentIntent(chamaId, intent.id, {
        connection_id: activeConnection.id,
      });
      return { intentId: intent.id, attempt };
    },
    {
      // An STK push does not settle the contribution by itself — the provider
      // callback does. Refresh every money-affected view so nothing on screen
      // claims a balance the API has not actually settled.
      invalidates: chamaId ? moneyScopeKeys(chamaId) : [],
      onSuccess: ({ intentId, attempt }) => {
        // The request has now reached a known API outcome. Network failures
        // retain the key for safe retries; a completed attempt starts a new key.
        idempotencyKeyRef.current = null;
        createdIntentIdRef.current = null;
        setPaymentFailureStage(null);
        setUncertainIntentId(null);
        if (attempt.status === "FAILED") {
          // A terminal failed intent is a completed logical request. A corrected
          // phone/amount is a new request and therefore receives a new key.
          setFailedAttempt(attempt);
          setPushedAmount(null);
          return;
        }
        setFailedAttempt(null);
        setPushedAmount(amount);
        setPushedPhone(payerPhone.trim() ? normalizePhone(payerPhone) : null);
        setAttemptStatus(attempt.status);
        setPendingIntentId(
          attempt.status === "INITIATED" || attempt.status === "TIMEOUT" || attempt.status === "UNKNOWN"
            ? intentId
            : null
        );
      },
      onError: () => {
        const intentId = createdIntentIdRef.current;
        if (intentId) {
          // Intent creation succeeded, but initiation's response was lost or
          // failed. Keep this intent blocking another request until checked.
          setUncertainIntentId(intentId);
          setPendingIntentId(intentId);
          setAttemptStatus("UNKNOWN");
          if (chamaId) refetchEntry(`${chamaId}:payment-intents`);
        }
      },
    }
  );

  const mutateExistingIntent = useMutation(
    async (input: { chamaId: string; intentId: string; connectionId: string }) =>
      initiatePaymentIntent(input.chamaId, input.intentId, {
        connection_id: input.connectionId,
      }),
    { invalidates: chamaId ? moneyScopeKeys(chamaId) : [] }
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || !chamaId) return;

    setPushedAmount(null);
    setFailedAttempt(null);

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
    // This check is advisory. The backend normalizes and validates the phone,
    // and its PHONE_FORMAT result remains authoritative.
    const trimmedPhone = payerPhone.trim();
    setFormError(null);

    const result = await mutate({
      membershipId: resolvedMembershipId,
      phoneNumber: trimmedPhone ? trimmedPhone : null,
    });
    if (result) {
      if (result.attempt.status === "FAILED") return;
      reset();
      setAmount("");
      setPayerPhone("");
    } else if (chamaId) {
      // Refresh local intent state after an uncertain response.
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
  const serverInFlightIntent = (intents.data ?? []).find(
    (intent) =>
      intent.membership_id === effectiveMembershipId &&
      intent.status === "PROCESSING" &&
      !ignoredIntentIds.includes(intent.id)
  );
  const trackedIntent = (intents.data ?? []).find((intent) => intent.id === pendingIntentId);
  const terminalAttemptStatus =
    trackedIntent?.status === "SUCCEEDED" || trackedIntent?.status === "FAILED"
      ? trackedIntent.status
      : null;
  const visibleAttemptStatus = terminalAttemptStatus ?? attemptStatus;
  const blockingIntentId =
    (pendingIntentId &&
    !ignoredIntentIds.includes(pendingIntentId) &&
    !terminalAttemptStatus
      ? pendingIntentId
      : null) ?? serverInFlightIntent?.id ?? null;
  const canSubmit =
    Boolean(effectiveMembershipId) &&
    amountIsValid &&
    !isPending &&
    !blockingIntentId;

  function stopWaitingForIntent(intentId: string) {
    setIgnoredIntentIds((current) =>
      current.includes(intentId) ? current : [...current, intentId]
    );
    setPendingIntentId((current) => (current === intentId ? null : current));
    setUncertainIntentId((current) => (current === intentId ? null : current));
    setConfirmStopIntentId(null);
    setPushedAmount(null);
    setPushedPhone(null);
    setAttemptStatus(null);
    setFailedAttempt(null);
    setFormError(null);
    idempotencyKeyRef.current = null;
    reset();
  }

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
              <p>{paymentErrorMessage(error)}</p>
              {uncertainIntentId ? (
                <>
                  <p className="mt-1">
                    Payment intent {uncertainIntentId.slice(0, 8)} was created, but its initiation
                    result was not confirmed. Check or retry this same intent before starting another
                    payment. Retrying does not create a second intent.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    loading={mutateExistingIntent.isPending}
                    disabled={isPending}
                    onClick={async () => {
                      if (!chamaId || !activeConnection || !uncertainIntentId) return;
                      const retry = await mutateExistingIntent.mutate({
                        chamaId,
                        intentId: uncertainIntentId,
                        connectionId: activeConnection.id,
                      });
                      if (retry) {
                        setUncertainIntentId(null);
                        setPendingIntentId(
                          retry.status === "INITIATED" || retry.status === "TIMEOUT" || retry.status === "UNKNOWN"
                            ? uncertainIntentId
                            : null
                        );
                        setAttemptStatus(retry.status);
                        reset();
                        refetchEntry(`${chamaId}:payment-intents`);
                      }
                    }}
                  >
                    Check / retry this payment
                  </Button>
                </>
              ) : paymentFailureStage === "creating" ? (
                <p className="mt-1">
                  The server did not confirm whether it created a payment intent. Retry with the same
                  details; the same idempotency key is retained to avoid duplicate intents.
                </p>
              ) : (
                <p className="mt-1">Review Payment intents before starting another payment.</p>
              )}
            </Alert>
          ) : failedAttempt ? (
            <Alert tone="error" title="The payment request failed">
              {attemptFailureMessage(failedAttempt)}
            </Alert>
          ) : pushedAmount ? (
            <Alert
              tone={
                visibleAttemptStatus === "FAILED"
                  ? "error"
                  : visibleAttemptStatus === "SUCCEEDED"
                    ? "success"
                    : "info"
              }
              title={
                visibleAttemptStatus === "SUCCEEDED"
                  ? "Payment confirmed"
                  : visibleAttemptStatus === "FAILED"
                    ? "Payment request failed"
                  : visibleAttemptStatus === "INITIATED"
                    ? "Payment request sent"
                    : "Payment status is being confirmed"
              }
            >
              <p>
                We pushed an M-Pesa request for{" "}
                <strong>{formatMoney(pushedAmount)}</strong> to{" "}
                <strong>
                  {pushedPhone ? formatPhone(pushedPhone) : "your registered phone number"}
                </strong>
                .
              </p>
              <p className="mt-1">
                {visibleAttemptStatus === "FAILED"
                  ? "The provider reported a failure. Review this intent's attempt details before creating another payment."
                  : visibleAttemptStatus === "SUCCEEDED"
                    ? "Your contribution and shares update from the backend after settlement. Refresh the contribution and shares views if they do not appear yet."
                    : "Your contribution and shares update only after M-Pesa confirms the payment and the backend settles it. Wait for the phone prompt and check “Payment intents” for the latest status."}
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
            required={false}
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
          {blockingIntentId ? (
            <Alert tone="info" title="Payment still processing">
              <p>
                This payment is still being reconciled. You can keep waiting for its status, or stop
                waiting on this page to make another payment request.
              </p>
              {confirmStopIntentId === blockingIntentId ? (
                <div className="mt-3 space-y-2">
                  <p>
                    This does not cancel the M-Pesa prompt. The earlier payment may still complete,
                    which could result in two payments. Cancel or let that prompt expire on your phone
                    before proceeding.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => stopWaitingForIntent(blockingIntentId)}
                    >
                      I understand — allow another payment
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setConfirmStopIntentId(null)}
                    >
                      Keep waiting
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={intents.refetch}
                  >
                    Refresh payment status
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setConfirmStopIntentId(blockingIntentId)}
                  >
                    Stop waiting and start another
                  </Button>
                </div>
              )}
            </Alert>
          ) : null}
          {ignoredIntentIds.length > 0 ? (
            <Alert tone="info" title="Earlier payment still being reconciled">
              Stopping the wait here did not cancel the M-Pesa request. It may still complete. This
              page continues checking its status; review Payment intents before making further
              payments.
            </Alert>
          ) : null}
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

function paymentErrorMessage(error: unknown): string {
  const apiError = toApiError(error);
  if (apiError.code === "PHONE_FORMAT") {
    return "Use a Safaricom number in the 07XXXXXXXX or 011XXXXXXX format (or its 254 international form).";
  }
  if (apiError.code?.startsWith("DARAJA_")) {
    return darajaFailureMessage(apiError.code, apiError.message);
  }
  return getErrorMessage(apiError);
}

function attemptFailureMessage(attempt: PaymentAttemptOut): string {
  if (attempt.failure_code === "PHONE_FORMAT") {
    return "Use a Safaricom number in the 07XXXXXXXX or 011XXXXXXX format (or its 254 international form), then start a new payment request.";
  }
  if (attempt.failure_code?.startsWith("DARAJA_")) {
    return darajaFailureMessage(attempt.failure_code, attempt.failure_message_safe ?? "");
  }
  return [attempt.failure_code, attempt.failure_message_safe]
    .filter(Boolean)
    .join(": ") || "The provider could not complete this payment. Review the attempt details before trying again.";
}

function darajaFailureMessage(code: string, message: string): string {
  const explanation = message && message !== "Daraja did not accept the STK Push request"
    ? ` Provider response: ${message}`
    : "";
  return `${code}: Daraja rejected the STK Push request.${explanation} Check that the payer number is a Safaricom mobile number in the 07XXXXXXXX or 011XXXXXXX range (or its 254 international form). If it is valid, ask the Chama administrator to check the Daraja connection settings.`;
}
