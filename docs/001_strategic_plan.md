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
