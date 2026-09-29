# Agent brief: STK Pay button does not fire

**Scope:** Fix only the non-firing STK submit on the Payments page.  
**Do not** change backend, auth, Chama context, connection validate, C2B, ledger, other forms, or unrelated frontend files.

**Confirmed (not guesses):**

- Backend Daraja validate works (`POST …/payment-connections/…/validate` → 200, OAuth to sandbox OK).
- Server logs show **no** `POST …/payment-intents` when the user clicks Pay → the click never reaches the API.
- Root cause is in the frontend form validation path below.

---

## File to change (only this)

`features/payments/PaymentForm.tsx`

---

## Exact defect

### 1. Submit uses `membershipId` state; UI displays `effectiveMembershipId`

State:

```ts
const [membershipId, setMembershipId] = useState("");
```

Select value:

```ts
const effectiveMembershipId =
  myMemberships.some((m) => m.id === membershipId) || memberships.isLoading
    ? membershipId
    : (myMemberships[0]?.id ?? "");

// Select uses effectiveMembershipId
value={effectiveMembershipId}
```

Submit:

```ts
async function onSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (isPending || !chamaId) return;
  if (!membershipId || !/^\d+(\.\d{1,2})?$/.test(amount)) return; // silent exit
  const result = await mutate();
  // ...
}
```

And mutate creates the intent with:

```ts
membership_id: membershipId,
```

**Effect:** If the user never changes the “Paying as” dropdown, the Select can show the first membership (`effectiveMembershipId`) while `membershipId` stays `""`. Submit hits `if (!membershipId) return` and exits with **no error and no network request**.

### 2. Validation failures are silent

Same line:

```ts
if (!membershipId || !/^\d+(\.\d{1,2})?$/.test(amount)) return;
```

Empty amount or invalid amount also exits with no Alert. User sees “button does nothing.”

---

## Required fix (surgical)

### A. Resolve membership id for submit the same way the Select displays it

Before create/initiate, use a single resolved id, e.g.:

```ts
const resolvedMembershipId =
  membershipId && myMemberships.some((m) => m.id === membershipId)
    ? membershipId
    : (myMemberships[0]?.id ?? "");
```

Use `resolvedMembershipId` in the empty check and in `createPaymentIntent(…, { membership_id: resolvedMembershipId, … })`.

Optional but preferred: when `myMemberships` loads and `membershipId` is still `""`, set state once:

```ts
// e.g. in render path or a small effect — keep minimal
if (!membershipId && myMemberships[0]?.id) {
  setMembershipId(myMemberships[0].id);
}
```

If you use an effect, depend only on membership list ids; do not touch other features.

### B. Do not fail silently

Replace the bare `return` with a visible error (existing Alert pattern in this file):

- Missing membership → set a local error string or reuse mutation error surface, e.g. “Select your membership.”
- Invalid/empty amount → “Enter a valid amount (e.g. 1 or 10.00).”

Do not invent new UI libraries; use existing `Alert` / state already in this component.

### C. Keep the rest of the flow unchanged

Leave as-is:

- `createPaymentIntent` then `initiatePaymentIntent` sequence
- `idempotencyKeyRef` behaviour
- `purpose: "CONTRIBUTION"`, `currency: "KES"`
- Gates that hide the form when `!myMemberId`, no active membership, or no `ACTIVE` connection
- `lib/api/payments.ts`, Button, other payment components

---

## Out of scope (do not touch)

- `ConnectionForm.tsx`, `ConnectionsList.tsx`, `IntentsList.tsx`, `IntentAttemptsModal.tsx`
- Backend, env, ngrok, Daraja adapter
- Auth / session / ChamaContext (except reading values already used here)
- Changing STK phone handling on the server (intent uses membership-linked phone on backend)
- Refactors, renames, dependency upgrades, formatting-only sweeps outside this file

---

## Acceptance criteria

1. With an ACTIVE connection and an ACTIVE membership for the logged-in user’s `member_id`, open Payments.
2. Without manually changing “Paying as”, enter amount `1` and click Pay.
3. Browser Network shows:
   - `POST /api/v1/chamas/{chamaId}/payment-intents` (2xx)
   - `POST /api/v1/chamas/{chamaId}/payment-intents/{id}/initiate` (2xx or documented error body)
4. Backend access log shows those POSTs (previously absent).
5. Empty amount or no membership shows an on-form error; click is not a no-op.
6. No unrelated files changed in the PR/commit.

---

## Suggested commit message

```text
fix(payments): use resolved membership id on STK submit

PaymentForm displayed effectiveMembershipId but submitted membershipId
state (often ""). Empty membership or amount failed silently so Pay
never called the API. Resolve membership for submit and surface validation errors.
```
