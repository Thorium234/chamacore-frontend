
---

### `docs/PHASES.md`

```markdown
# Implementation phases — ChamaCore Frontend

Follow this order. Do not skip auth or invent later-phase screens early.

---

## Phase 0 — Scaffold

- [ ] Next.js App Router + TypeScript  
- [ ] Install Axios  
- [ ] `.env.local` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`  
- [ ] `src/lib/api/client.ts` (shared axios + refresh interceptor)  
- [ ] Folder layout per `AGENTS.md`  

**Done when:** `npm run dev` starts; client can `GET /health` on backend.

---

## Phase 1 — Authentication

- [ ] Register page → `POST /api/v1/auth/register`  
- [ ] Login page → **form** `POST /api/v1/auth/token`  
- [ ] Store `access_token` + `refresh_token`  
- [ ] Axios interceptor: 401 → refresh → retry once  
- [ ] Logout → `POST /api/v1/auth/logout` + clear storage  
- [ ] `GET /api/v1/auth/me` for session bootstrap  
- [ ] Protected app shell (redirect if no access token)  
- [ ] Member-link form → `POST /api/v1/auth/me/member-link`  

**Done when:** register → login → me → refresh cycle → logout works against local backend.

---

## Phase 2 — Chama & members

- [ ] Create Chama  
- [ ] Active Chama context (selected `chama_id`)  
- [ ] View Chama detail  
- [ ] List / add memberships  
- [ ] Membership status ACTIVE/INACTIVE (chair UI)  
- [ ] Roles list / assign / remove (chair UI)  

**Done when:** chair can create a Chama, add a member, assign TREASURER/SECRETARY.

---

## Phase 3 — Contributions & shares

- [ ] List contributions  
- [ ] Record contribution (chair/treasurer)  
- [ ] Confirm contribution (chair)  
- [ ] Reverse contribution (chair)  
- [ ] View shares for a membership  
- [ ] Disable double-submit on money actions  

**Done when:** confirm shows shares; UI reflects PENDING/CONFIRMED/REVERSED from API only.

---

## Phase 4 — Ledger

- [ ] List ledger accounts + balances  
- [ ] Account entry history (cursor pagination)  
- [ ] Transaction history (`/ledger`)  
- [ ] Dashboard cards **only** from API balances (no client-side totals)  

**Done when:** after contribution confirm, Cash / Share Capital balances update from API refetch.

---

## Phase 5 — Payments (chair)

- [ ] List payment connections  
- [ ] Create connection (collect credentials once; never show raw secrets again)  
- [ ] Validate / disable connection  
- [ ] List / create payment intents with **stable** `idempotency_key`  
- [ ] Do **not** build webhook or C2B callback pages  

**Done when:** chair can create and validate a Daraja connection; intents list loads.

---

## Phase 6 — Optional (backend-confirmed only)

- [ ] Loans UI  
- [ ] Payouts UI  
- [ ] Audit log UI  

Only after paths exist in backend OpenAPI / `06_API_CONTRACT.md`.

---

## Explicitly out of scope

- USSD / React Native  
- Implementing M-Pesa callbacks in the browser  
- Storing Daraja or JWT signing secrets in the frontend  
- Client-side ledger posting  
- Inventing endpoints not in the API map  
