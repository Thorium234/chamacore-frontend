# Backend-to-Frontend Implementation Readiness Report

**Reviewed:** 2026-09-30  
**Frontend:** `frontend/chamacore-frontend` (Next.js 16, React 19, TypeScript, Axios, Tailwind CSS 4)  
**Backend:** `pybased/chamacore` (FastAPI, SQLAlchemy, PostgreSQL in production)  
**Purpose:** Compare current backend routes and behavior with the frontend implementation, identify backend findings that remain open, and give a practical frontend work plan.  
**Review type:** Static inspection of source, API clients, UI features, and docs. No build, tests, live API calls, or payment-provider transactions were run for this report.

## Executive summary

The frontend is not starting from a blank slate. It already has feature areas and API clients for authentication, Chamas, members/roles, contributions, shares, ledger, payment connections/intents/attempts, loans/repayments, payouts, audit events, and registration fees. Ledger transaction and account-entry history already use cursor pagination.

The clearest frontend gap is Chama discovery: the backend now exposes authenticated `GET /api/v1/chamas` for the current user's Chamas, but the frontend does not call it and instead stores known Chama IDs in browser storage. The clearest frontend scale gaps are the collection screens that fetch entire arrays and the audit screen that does not expose the backend's `limit`/`offset` controls. Existing frontend documentation is also inconsistent: some docs still describe loans, payouts, audit, and registration fee operations as unconfirmed or unfinished even though the backend routes and frontend screens exist.

The backend reliability findings from `docs/14_GAP_ANALYSIS_AND_IMPROVEMENT_PLAN.md` remain open on the inspected source. Frontend code must not try to repair backend payment/audit transaction behavior or fabricate financial state; those need backend changes.

## What the backend already provides and the frontend already covers

| Capability | Backend contract | Frontend evidence | Assessment |
|---|---|---|---|
| Authentication and membership identity | Register/login/refresh/logout, current user, member link | `lib/api/auth.ts`, auth pages and shared API client | Present; verify against live API during integration work |
| Chama and membership administration | Create/list/get/update Chamas; memberships and role endpoints | `lib/api/chamas.ts`, `memberships.ts`, `roles.ts`; Chama/member features | Mostly covered; **current-user Chama listing is not wired in** |
| Contributions and shares | Create, confirm, reverse contributions; membership shares | `lib/api/contributions.ts`, `shares.ts`; contribution/share features | Covered; contribution list currently fetches the full collection |
| Ledger | Account balances, cursor-paged transaction history and account entries | `lib/api/ledger.ts`, cursor pager, ledger UI | Covered; preserve server-provided cursors and backend balance values |
| Provider connections and payment intents | Configure/validate/disable connections, register C2B URLs, create/initiate intents, inspect attempts | `lib/api/payments.ts`; payments screens and attempt drill-down | Covered at a basic operational UI level; payment history is not paged and callback recovery is a backend concern |
| Loans and repayments | Apply, submit, approve/reject/cancel/disburse, record/list/reverse repayments | `lib/api/loans.ts`, loan features and routes | UI/client exist; collection and repayment responses are unpaged |
| Payouts | Request, approve/reject, process, complete/fail/reverse | `lib/api/payouts.ts`, payout feature | UI/client exist; payout collection is unpaged |
| Audit | Chama audit event list, backend accepts `limit` and `offset` | `lib/api/audit.ts`, `features/audit/AuditLogTable.tsx` | UI exists; client currently requests one default response without pagination controls |
| Registration fees | Get, pay, waive, reverse payment, list payment history | `lib/api/registration-fees.ts`; member feature invokes pay/reverse | Actions are partly integrated; inspect member detail/list UX to expose fee status and payment history consistently |

The payments feature should continue to use backend-returned intent/attempt states. Provider callbacks, credential handling, contribution settlement, and ledger posting belong to the backend; do not implement those rules in the browser.

## Backend gaps from the prior report: current status

| Prior finding | Current source status | Frontend implication |
|---|---|---|
| Webhook event committed before callback/settlement processing; duplicate retry is marked `DEDUPLICATED` without resuming the original event | **Still open** in `app/services/payment_webhook.py` (`_store_event` commits `RECEIVED`; matching duplicate returns as deduplicated) | Show actual intent/attempt state and offer safe refresh. Do not mark a payment complete based only on a browser result. Backend needs replay/reconciliation before the UI can promise automatic recovery. |
| Payment-connection change committed before its audit event in a separate transaction | **Still open** in `app/services/payment_connection.py` with `AuditService.record_commit()` in `app/services/audit.py` | UI should handle an error followed by a successful refetch (partial-commit ambiguity) carefully. Backend should make change and audit atomic; client retries must not assume an error means no change. |
| Most Chama-domain list queries are unbounded | **Still open** for contributions, memberships, loans, payment intents, payouts, and related collections in inspected repositories/routes. Ledger history already has cursor pagination. | Current list views pull full arrays. Keep current behavior compatible, but plan for cursor/page metadata once backend contracts are added. |
| In-process rate limiter and metrics restrict safe horizontal scaling | **Still the documented deployment constraint** in `docs/12_PRODUCTION_RUNBOOK.md` and `app/core/ratelimit.py` | No frontend mitigation. Backend/operations must retain the single-process topology or provide shared rate-limit and metrics infrastructure before scaling out. |
| Payment-specific operational metrics/reconciliation and benchmark evidence | **Not established by this frontend review**; backend report recommends adding/validating them | Expose safe user-facing payment status and support references only when the backend contract supplies them. Avoid inventing an operator dashboard from hidden webhook tables. |

The report above is based on current source inspection; it does not establish whether production monitoring outside the repository already exists.

## Frontend work to implement

### P1 — Use the backend's current-user Chama list

The backend now has `GET /api/v1/chamas` returning the authenticated user's Chamas. The frontend currently exports only `createChama`, `getChama`, and `updateChama` from `lib/api/chamas.ts`. `features/chamas/ChamaContext.tsx`, `components/layout/ChamaSwitcher.tsx`, and the profile/app-shell flows use `knownChamaIds` saved in local storage and fetch each Chama individually.

**Implementation:**

1. Add a typed `listMyChamas(): Promise<ChamaOut[]>` API function for `GET /chamas`.
2. On authenticated session bootstrap, fetch the list and use it as the authoritative set for the switcher and profile page.
3. Preserve the selected `active_chama_id` only if it is still in the returned list; otherwise select a sensible available Chama or show the existing empty state.
4. After creating a Chama, refresh the server list and select the returned Chama. Keep local storage as a selection preference/cache only, not as the source of membership truth.
5. Provide loading, empty, expired-membership/403, retry, and offline states. Do not infer access from a locally saved ID.

**Acceptance checks:** Existing users with multiple Chamas see all memberships after signing in on a new browser; a Chama removed or made inaccessible disappears after refresh; create-then-switch works; API errors do not erase the stored selection until the server response is understood.

### P1 — Make payment status refresh safe and clear

The frontend can initiate a payment and inspect attempts, while backend callbacks may update state later. Because backend callback replay is still an open issue, a frontend timeout or lost response must not be converted into a local `FAILED` or `SUCCEEDED` financial state.

**Implementation:**

- Keep status labels bound to the latest backend intent/attempt response.
- Add an explicit refresh action and a modest, bounded refresh strategy while a payment is `PROCESSING` (stop on terminal state and when the page is inactive; avoid aggressive polling).
- Explain `PENDING`, `PROCESSING`, `UNKNOWN`/`TIMEOUT`, `SUCCEEDED`, and `FAILED` using the backend's actual response fields and approved copy.
- On initiation timeout/network loss, reload the intent and attempts before offering another initiate action. Continue using a stable idempotency key for intent creation.
- Invalidate/refetch payment intent, attempt, contribution, share, and ledger queries after a confirmed backend state change; do not optimistically mutate ledger balances.
- Do not surface raw provider callback payloads, secrets, internal stack traces, or unsafe provider error text.

**Dependency:** Backend should first implement recoverable inbox processing and reconciliation described in the backend gap report. The UI can improve uncertainty messaging now, but cannot repair missing backend settlement.

### P2 — Add pagination-ready list components and API types

Several UI clients request `Promise<T[]>` for endpoints that currently return full arrays. This includes contribution, membership, loan, payout, payment-intent/attempt, and repayment histories. The backend must first define pagination contracts for these APIs; do not guess cursor parameter names or response envelopes.

**Implementation after backend contract lands:**

- Agree on one response shape and cursor semantics in backend API docs/OpenAPI (recommended shape is `items`, `next_cursor`, `has_more`, consistent with ledger).
- Extend each TypeScript response type and API function to pass `limit` and `cursor`.
- Reuse/adapt the existing `features/ledger/useCursorPager.ts` and UI affordances so list pages can load subsequent rows without duplicating records.
- Preserve stable ordering and invalidate the first page after mutations.
- For loans, avoid depending on a full repayment history embedded in every loan row; use the loan-specific repayment endpoint and page it if the backend contract supports that.
- Retain compatibility with existing array responses until the backend change is deployed; coordinate API rollout rather than shipping a frontend-only envelope assumption.

### P2 — Expose audit pagination already available on the backend

`GET /api/v1/chamas/{chama_id}/audit-events` accepts `limit` (1–500) and `offset`; the frontend's `listAuditEvents()` currently sends neither and consumes a bare array.

**Implementation:** Add optional `limit`/`offset` parameters to `lib/api/audit.ts`, request a bounded page, and provide previous/next controls or “load more” in the audit screen. Keep the array response contract. Ensure page controls reset when Chama changes and after refetch. Because offset paging may shift as new events arrive, document that a refresh returns the latest first page; consider keyset pagination later if audit volume warrants it.

### P2 — Complete registration-fee visibility

The frontend has API functions for reading fee status, paying, waiving, reversing, and listing payment history. Member UI invokes pay/reverse, but the review did not find a dedicated registration-fee payment-history presentation.

**Implementation:** Confirm the member screen consistently shows fee amount, paid/waived/unpaid state, last payment, allowed chair actions, and reversal history using `RegistrationFeeOut` and `RegistrationFeePaymentOut`. Show reversal as a consequential action with confirmation and explain the ledger effect. Do not calculate fee state or payment totals in the browser when the backend returns authoritative values.

### P2 — Reconcile frontend documentation with the actual shipped feature set

The docs contain stale instructions and status labels. For example, `docs/endpoints.md` says loans, payouts, and audit should be confirmed in backend docs, while corresponding routes and frontend modules exist. `docs/PHASES.md` presents loans/payouts/audit as optional backend-confirmed future work despite current screens. `docs/report_01.md` is dated 2026-09-25 and has a snapshot status that should not be treated as current.

**Implementation:** Update `docs/endpoints.md`, `docs/PHASES.md`, `docs/API_MAP.md`, and the progress report after checking the backend API contract/OpenAPI. Mark webhook/C2B callback endpoints as server-to-server only. Document `GET /chamas` and audit query parameters. Keep one dated current status report and label older reports as historical snapshots rather than silently rewriting their dates.

## Suggested delivery order

1. Wire `GET /chamas` into session bootstrap and Chama switching; add the acceptance checks above.
2. Improve payment pending/unknown state refresh and retry messaging without optimistic financial updates.
3. Add audit `limit`/`offset` UI controls using the existing backend contract.
4. Review and finish registration-fee status/history presentation.
5. Coordinate a pagination API contract with the backend, then update list clients and screens together.
6. Reconcile stale frontend docs against the current OpenAPI contract.
7. Separately track backend webhook recovery, audit atomicity, concurrency tests, payment monitoring, and load benchmarks. Do not treat a frontend change as closing those backend items.

## Out of scope for frontend implementation

- Receiving or validating provider webhooks/C2B callbacks in the browser.
- Posting, reversing, or calculating ledger balances in client code.
- Replacing backend payment recovery, audit transaction guarantees, authorization, idempotency, or financial concurrency controls.
- Guessing future pagination formats, endpoint paths, provider fields, or status values before the backend publishes them.

## Source paths reviewed

Backend: `app/api/v1/chamas.py`, `audit.py`, `payments.py`, `loans.py`, `payouts.py`, `registration_fees.py`; `app/services/payment_webhook.py`, `payment_connection.py`, `audit.py`; `app/repositories/contribution.py`, `membership.py`, `loan.py`, `payment.py`, `payout.py`, `ledger.py`; `docs/12_PRODUCTION_RUNBOOK.md`, `docs/14_GAP_ANALYSIS_AND_IMPROVEMENT_PLAN.md`.

Frontend: `lib/api/chamas.ts`, `payments.ts`, `contributions.ts`, `loans.ts`, `payouts.ts`, `audit.ts`, `registration-fees.ts`, `ledger.ts`; `features/chamas/ChamaContext.tsx`, `features/ledger/useCursorPager.ts`, payment/member/audit features; `docs/endpoints.md`, `docs/PHASES.md`, `docs/API_MAP.md`, `docs/report_01.md`.
