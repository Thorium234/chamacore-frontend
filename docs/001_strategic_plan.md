# ChamaCore Frontend — Strategic plan (Next.js + TypeScript + Axios)

Scope: screens, role-aware UX, forms, client validation UX, calling backend contracts.
Do **not** implement business settlement, OTP storage, or PDF rendering logic on the client (download only).

---

## 1. Goals (mapped to product problems)

| Product need | Frontend responsibility |
|--------------|-------------------------|
| Payment OK but shares empty | Call correct list APIs; show contribution/share/ledger panels; empty states that distinguish “no data” vs “not settled” |
| OTP + must change password | Login → detect flag → force change-password route before app shell |
| Password standards | Mirror backend policy in UI messages; show requirements |
| Developer dashboard | **Platform admin** UI (separate from chama chair) |
| Flexible signup/login | Register/login fields: email and/or phone and/or ID |
| Role dashboards | Layout + nav + widgets by role; hide mutations member must not do |
| More CRUD | Forms/tables for new endpoints as backend ships |
| Phone formatting | Input mask / display `07…`; send normalized or let API normalize |
| Notifications | In-app list + badges; optional permission prompts later |
| Alternate pay phone | Optional “pay from this number” on Pay form |
| PDF statements | Date range picker → download file |
| Avatars / logos | Upload UI; fallback initials avatar |
| Transparency | Shared “Group activity” views for all members (read-only) |
| Manual entry | Executive-only forms (period, amount, date, member) |

---

## 2. Current baseline

- Next.js App Router, TS, Axios client, auth session  
- Pages: login, register, dashboard, members, contributions, payments, ledger, shares, loans, etc.  
- Known issues to respect in plan:
  - `localStorage` chama ids must clear on logout (per-user)
  - STK button must use effective membership id
  - `NEXT_PUBLIC_API_BASE_URL` → `http://localhost:8000` in local dev  

---

## 3. Workstreams (ordered)

### F0 — Trust the money path (P0)

1. After STK/C2B success, refresh:
   - contributions
   - shares
   - payments/attempts
   - ledger (if shown)
2. Chair dashboard widgets: **my** contribution status + group totals (from API).  
3. Clear copy if payment SUCCEEDED but contribution pending settlement.

**Depends on:** Backend W0.

---

### F1 — Auth UX (P0)

1. **Register:** user chooses identifiers (email / phone / ID) + password; show policy checklist.  
2. **Login:** one username field (email or phone or ID) + password — structure stays simple.  
3. If API returns `must_change_password`: hard redirect to `/change-password` (block shell).  
4. OTP screens: request OTP / enter OTP when backend enables.  
5. Logout: clear tokens **and** chama localStorage keys.

**Depends on:** Backend W1.

---

### F2 — Role-based shell (P1)

| Role | Dashboard emphasis |
|------|-------------------|
| Member | Own balances, own contributions, own loans; group activity **read-only** |
| Chair | Group totals, members, approvals, settings entry points |
| Treasurer | Payments, manual entry, statements, confirmations |
| Secretary | Members/roster oriented (as backend allows) |

1. Nav items from permissions (prefer API claims or `/me` roles).  
2. Route guards: mutate pages return 403 UI for members.  
3. Do not only hide buttons — still handle 403.

**Depends on:** Backend W3.

---

### F3 — Platform developer dashboard (P1)

Separate area e.g. `/platform` or `/admin` (platform admin only):

- List chamas + status  
- Actions: activate, on-hold, terminate, reactivate + reason  
- Not mixed into normal chair chama UI  

**Depends on:** Backend W2.

---

### F4 — Payments UX (P1)

1. Phone field: accept `07…`, show normalized hint `254…`.  
2. Optional “Payer phone” if backend allows alternate MSISDN.  
3. STK: membership select fixed; disable submit until valid; surface API errors (`DARAJA_*`).  
4. History table: status, amount, time, receipt if any.

**Depends on:** Backend W4 + existing payments API.

---

### F5 — Manual entry (executives) (P1)

Form: member, amount, period (month/year), **payment date**, note → POST manual contribution.  
Visible only to allowed roles.

**Depends on:** Backend manual contribution API.

---

### F6 — Transparency (P1–P2)

Shared pages for all active members:

- Group transactions / contributions list  
- Balances summary (read-only)  

Chair sees same data plus management actions elsewhere.

**Depends on:** Backend W8.

---

### F7 — Statements PDF (P2)

Date range → “Download statement” → blob download from API.  
No client-side PDF library required if backend returns file.

---

### F8 — Profile & branding (P2)

- Member avatar upload + initials fallback  
- Chama logo upload (chair)  
- Profile edit within API rules  

---

### F9 — Notifications UI (P2)

- Bell / list of due contribution reminders  
- Empty state when none  
- Deep link to Pay or contribution page  

**Depends on:** Backend notification list API.

---

## 4. Page / module map (target)

| Route | Audience | Notes |
|-------|----------|--------|
| `/login`, `/register`, `/change-password`, `/otp` | Public / gated | Flexible identifiers |
| `/dashboard` | Role-specific widgets | Composition by role |
| `/members` | Chair/Secretary+ | Member: limited |
| `/contributions` | All (scoped) | Manual entry section for execs |
| `/payments` | All (scoped) | STK + history |
| `/shares`, `/ledger` | All (read policies) | Fix visibility after pay |
| `/statements` | All (scoped) | Date range + download |
| `/profile` | Self | Avatar |
| `/platform/*` | Platform admin | Chama lifecycle |
| `/settings/chama` | Chair | Logo, contribution schedule |

---

## 5. Frontend principles

1. **No business truth in the client** — shares/balances only from API.  
2. **Role from server** — not hard-coded email.  
3. **Surgical UI changes** — extend existing payments/auth layouts; avoid rewrite.  
4. **Local dev:** `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`.  
5. **Logout hygiene** — clear chama selection keys.  
6. **Accessible errors** — show backend `detail` / safe payment messages.

---

## 6. Implementation phases (frontend)

| Phase | Focus | Backend dependency |
|-------|--------|-------------------|
| **F1** | F0 payment/contribution/share refresh & empty states | B1 |
| **F2** | F1 auth (change-password gate, flexible login fields) | B2 |
| **F3** | F2 role shell + guards | B3 |
| **F4** | F4 payments phone UX + F5 manual entry forms | B3–B5 |
| **F5** | F3 platform admin UI | B4 |
| **F6** | F6 transparency views | B6 |
| **F7** | F7 statements, F8 avatars, F9 notifications | B7–B8 |

---

## 7. Explicit non-goals (frontend)

- Storing OTP codes or validating OTP expiry as source of truth  
- Posting ledger entries from the client  
- Calling Daraja directly  
- Using `localStorage` as the source of chama membership lists (prefer API; localStorage only for UI selection hints, cleared on logout)

---

## 8. Handoff contract

For each backend phase, frontend needs:

- OpenAPI or documented request/response  
- Error codes for password policy, OTP, chama inactive, forbidden  
- Whether chair “my shares” is `GET .../shares?membership_id=` or embedded in dashboard DTO  

Until B1 is done, UI can only improve messaging; it cannot invent share rows.

---

## 9. Implementation status (backend reality check)

Recorded against the live backend source in `pybased/chamacore`, not against this plan's assumptions.

### 9.1 Shipped in the frontend

| Workstream | State | Notes |
|---|---|---|
| F0 Trust the money path | **Done** | `lib/query/money-scope.ts` centralizes the invalidation set (contributions, shares, ledger, payment-intents, audit-events, memberships). Every money mutation — contribution confirm/reverse, STK/C2B intent, manual entry — refreshes the whole scope so no screen can show stale money. `features/dashboard/MyContributionStatus.tsx` closes the F0.3 gap: when a payment is `SUCCEEDED` but the current period is still `PENDING`, it says so explicitly instead of leaving the member guessing. |
| F1 Auth UX | **Done (honest scope)** | Register/login copy matches the real contract: email + password only, no OTP, no password-reset. Member linking keeps phone + government ID. A forced password gate is now live (see 9.2.4). |
| F2 Role-based shell | **Done** | `features/roles/useMemberRoles.ts` exposes a `ChamaCapabilities` matrix verified line-by-line against `app/services/*.py`. Nav is split into **Overview** (every active member) and **Manage** (leadership). `features/roles/AccessDenied.tsx` explains the *actual* requirement per capability. All ad-hoc `roles.includes(...)` checks were replaced by matrix lookups. |
| F3 Platform admin dashboard | **Done** | `/platform` console: platform stats, Chama search with audited status transitions, user search, platform-admin grant/revoke, and force-password-reset. Gated by `features/platform/RequirePlatformAdmin.tsx`. |
| F4 Payments UX | **Done** | STK submit is validated before dispatch and the settlement window is described honestly. `lib/api/errors.ts` yields a permission-specific message for a 403 whose `detail` is not human-readable. Optional alternate payer number supported. |
| F5 Manual entry | **Done** | Manual contribution form retained; optional `payment_date` added for cash/bank entries (see 9.2.6). |
| F6 Transparency | **Done (read-only)** | New `/activity` page: group balances (from ledger accounts), group contributions with member/period/status filters, Chama-wide share units, and ledger history. No client-side money math anywhere. |
| F7 Statements PDF | **Done** | `/statements` downloads a server-rendered PDF, scoped to the caller's own statement by default. |
| F9 Notifications UI | **Done** | Header bell with unread badge + polling, plus a full `/notifications` inbox (unread filter, mark read, mark all read, delete). |

### 9.2 New backend capabilities found during implementation

Discovered by reading the backend, not mentioned in this plan:

1. **`GET /chamas/{chama_id}/shares`** — Chama-wide share records. Previously the plan assumed shares were only reachable per membership.
2. **Contribution query filters** — `membership_id`, `period`, `status`, `limit`, `offset` on the contributions list.
3. **Kenyan phone normalization** — `app/core/phone.py` folds `07…`, `7…`, `+2547…` to `254…` on write, and member-link already matches across variants. `lib/phone.ts` mirrors it for preview/display only.

These three were uncommitted working-tree changes in the backend when this plan was written, and have since shipped. The frontend still degrades safely rather than assuming they exist:

- Group-wide shares fall back to per-membership fetching on 404/405.
- `MyContributionStatus` verifies the server honoured `membership_id` (any foreign `membership_id` in the response means it was ignored) and narrows locally, so an older backend cannot leak other members' contributions into a "my contributions" view.

### 9.2.1 Capabilities added by backend commit `a541db7`

Verified against backend source, not against the verification report — the report is wrong on some points (see 9.3.1). These six gaps are now closed and implemented:

1. **Statements PDF** — `GET /chamas/{chama_id}/statements?from=&to=&membership_id=`. Returns an `application/pdf` blob only (no JSON variant). Members default to their own statement; chair/treasurer may target one member or the whole Chama. Implemented in `lib/api/statements.ts` + `features/statements/StatementDownload.tsx`; the filename is parsed from `Content-Disposition`.
2. **Notifications** — `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `DELETE /notifications/{id}`. `NotificationOut` carries `action`, `title`, `body`, `resource_type`, `resource_id`, `payload`, `is_read`. No badge or deep-link field exists, so the inbox links by `resource_type`/`resource_id` only.
3. **Platform administration** — `GET /platform/stats`, `GET /platform/chamas`, `PATCH /platform/chamas/{id}/status`, `GET /platform/users`, `POST`/`DELETE /platform/users/{id}/roles`, `POST /platform/users/{id}/require-password-change`. All are global, not Chama-scoped.
4. **Forced password change** — `must_change_password` on both `TokenOut` and `UserOut`, plus `POST /auth/change-password` (`{ current_password, new_password }`). The endpoint revokes every refresh token but leaves the current access token valid, and **no backend dependency enforces the flag**. `components/layout/AppShell.tsx` therefore gates the entire app chrome on it, and the form also appears on `/profile` as a voluntary action.
5. **Alternate payer phone** — `phone_number` on `PaymentIntentCreate`, echoed back as `requested_phone` on `PaymentIntentOut`. Omitting it charges the member's registered number (`app/services/payment_intent.py`). Shown on the pay form and on each intent row.
6. **Manual contribution payment date** — optional `payment_date` on `ContributionCreate`/`ContributionOut`, defaulting to the recording date. Surfaced in the contribution list under the recorded-at timestamp.

### 9.2.2 Design notes for the new work

- **`PLATFORM_ADMIN` is not a Chama role.** It lives in `user_platform_roles` and the backend filters it out of membership role lists (`app/services/role.py:28`). `types/api.ts` keeps it as a separate `PlatformRoleName` so it can never leak into the Chama capability matrix.
- **Platform admin discovery is a probe.** No endpoint reports the caller's platform role, so `features/platform/usePlatformAdmin.ts` calls `GET /platform/stats` and treats a 403 as "not an admin". The route itself is guarded by `RequirePlatformAdmin` *before* its data queries mount, so an unauthorized user triggers no data request.
- **`/platform` is a global route.** It does not require an active Chama, otherwise a platform admin who belongs to no Chama would be trapped on the onboarding screen and could never reach the console (`GLOBAL_ROUTES` in `AppShell.tsx`).
- **Notifications poll.** `lib/query/hooks.ts` gained `UseQueryOptions.refetchInterval`; the bell uses it. There is no push channel.

### 9.3 Still blocked — exact backend ask required

Nothing below is faked in the UI. Each needs a backend contract first.

| Plan item | Blocking gap | Ask |
|---|---|---|
| F1 OTP / 2FA | No OTP endpoints, no enrollment fields | Enrollment, challenge, and verify endpoints plus challenge state on the user |
| F1 flexible identifier login | `POST /auth/token` is still `OAuth2PasswordRequestForm` keyed on email | A JSON login accepting one `identifier` (email / phone / national ID). The strategic plan proposes this; the backend has not adopted it, so the login form stays email-only |
| F8 Profile & branding | No avatar/logo upload, no profile-update endpoint | Upload endpoint (presigned or multipart) and `PATCH /chamas/{id}` fields for name/logo |
| F3 caller-role discovery | `/auth/me` never reports platform-admin status, so the UI must probe `GET /platform/stats` | Include `platform_roles` on `UserOut` (or a `/platform/me`) so the shell can gate without a speculative request |
| F9 richer notifications | `NotificationOut` has no badge/severity/target-URL field | Add explicit link/badge fields if notification items are meant to deep-link |
| F9 push delivery | List/polling only | A push channel (SSE or WebSocket) if unread counts must update without polling |

#### 9.3.1 Where the verification report is wrong

`BACKEND_FRONTEND_VERIFICATION_REPORT_20261002.md` was checked line-by-line against source. Backend source wins; do not "fix" the frontend to match the report.

| Report claim | Actual |
|---|---|
| No logout endpoint | `POST /auth/logout` exists and revokes the refresh token (idempotent) |
| Chama status update is `POST` | `PATCH /platform/chamas/{id}/status` |
| Payer phone / payment date / `must_change_password` / notifications / statements do not exist | All shipped in `a541db7` |

### 9.4 Role matrix verified against the backend

Every capability in `useMemberRoles.ts` traces to a `require_role` / `require_roles` call:

- Leadership (chair/treasurer/secretary): create membership — `membership.py:73`
- Chair only: membership status `membership.py:126`; role assign/remove `role.py:42,77`; chama update `chama.py:95`; contribution confirm/reverse `contribution.py:86,160`; fee waive `registration_fee.py:60`; fee payment reverse `registration_fee.py:145`; payment connections `payment_connection.py:77`; loan approve/reject/cancel/disburse `loan.py:135,154,172,199`; loan repayment reverse `loan.py:346`; payout approve/reject/reverse `payout.py:91,111,228`
- Chair or treasurer: record contribution `contribution.py:50`; pay registration fee `registration_fee.py:88`; loan repayment `loan.py:269`; payout process/complete/fail `payout.py:128,155,209`

Two behaviours the UI must respect and now does:

- **No self-approval.** `_forbid_self_action` in `payout.py:271` and `loan.py:252` means a chair cannot approve their own payout or loan. Both lists already hide those actions for the requester.
- **Anyone active can apply.** `loan.apply` (`loan.py:80`) and `payout.request_payout` (`payout.py:52`) have no role guard, so those forms are intentionally not capability-gated.
