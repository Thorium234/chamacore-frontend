
# ChamaCore Frontend Progress Report

**Date:** 2026-09-25  
**Frontend repo:** https://github.com/Thorium234/chamacore-frontend  
**Backend repo:** https://github.com/Thorium234/Chamacore  
**Frontend HEAD:** `fb8431e` — *Add clear toggleable hamburger menu to app shell*

---

## 1. How far is the frontend?

The SPA is **largely feature-complete** relative to the original phase plan (auth → chama → contributions → ledger → payments → optional loans/payouts/audit).

### Recent commits

| Commit | Summary |
|--------|---------|
| `fb8431e` | Toggleable hamburger menu on app shell |
| `f9e1fb0` | Loans, payouts, audit log, registration-fee actions UI |
| `188b1ab` | Payment intent attempts drill-down |
| `252918f` | Core app: auth, chamas, members, ledger, payments |

### Phase status

| Phase | Status | Notes |
|-------|--------|--------|
| 0 Scaffold | Done | Next.js 16, React 19, TypeScript, Axios, Tailwind 4 |
| 1 Auth | Done | Login (form-urlencoded), register, refresh single-flight, logout, me |
| 2 Chama & members | Done | Create, switcher, memberships, roles — **see §3 bug** |
| 3 Contributions & shares | Done | List / create / confirm / reverse + shares |
| 4 Ledger | Done | Accounts, balances, entries, history |
| 5 Payments | Done | Connections, intents, attempts drill-down |
| 6 Loans / payouts / audit | UI present | Confirm against live backend `/docs` |

### Architecture present

- `lib/api/client.ts` — shared Axios, Bearer token, `X-Request-ID`, single-flight refresh on 401  
- Feature modules under `features/` and API modules under `lib/api/`  
- App routes: login, register, dashboard, members, contributions, shares, ledger, payments, loans, payouts, audit, profile  
- `.gitignore` correctly excludes `node_modules/`, `.next/`, `.env*` (keeps `.env.example`)

### Remaining work (not greenfield features)

1. **Fix post-create Chama access bug** (§3) — blocks first-run UX  
2. Integration / smoke testing against local backend  
3. Expand root README (currently minimal)  
4. Optional: add `docs/API_MAP.md`, fuller `AGENTS.md`, automated UI tests  
5. Verify loans/payouts/audit request shapes match current backend OpenAPI  

---

## 2. Process rule — backend gaps

If during frontend work (or this report’s follow-up fixes) the team finds that **the backend is missing an endpoint, field, or behaviour** required for a correct UI:

1. **Do not invent** a fake client-only API or hard-code financial truth.  
2. **Write a short report** under the frontend repo:

   ```text
   docs/BACKEND_GAP_<short-slug>.md

Example: docs/BACKEND_GAP_list_my_chamas.md

Each gap report should include:
Date and frontend commit SHA
What the UI needs
What was tried (endpoint / response)
Exact error or missing contract
Proposed backend change (path, method, body, auth)
Workaround used in the UI (if any)

Link the gap file from docs/FRONTEND_SPEC.md or root AGENTS.md so agents do not re-guess the same hole.

Known candidate gap (related to §3): there is no GET /api/v1/chamas (list chamas for the current user). The UI relies on localStorage (known_chama_ids + active_chama_id) and GET /api/v1/chamas/{id}. A server-side “my chamas” list would make onboarding and recovery more reliable. If product agrees, file docs/BACKEND_GAP_list_my_chamas.md and implement on the backend.

3. Bug: after creating a Chama — “This Chama is no longer available”
User-visible symptom
After a successful Create Chama, the app shell shows:
This Chama is no longer available

You are not an active member of this Chama

You may not have an active membership in it anymore.
Where the message is rendered
components/layout/AppShell.tsx — when activeChamaId is set but chamaError is set (from loading the active Chama):
textactiveChamaId set
  → GET /api/v1/chamas/{chama_id}
  → error
  → Alert: "This Chama is no longer available" + error.message
The backend message You are not an active member of this Chama is raised by:
app/services/access.py → authorize_chama_access():

actor.member_id is None, or
no row with (member_id, chama_id, status=ACTIVE)

That maps to HTTP 403.
Create flow (current)

CreateChamaForm → POST /api/v1/chamas with name, fee, and member details.
On success → setActiveChama(chama.id) (persists id to localStorage).
ChamaContext runs getChama(activeChamaId) → GET /api/v1/chamas/{id}.
Backend requires active membership linked via users.member_id.

Backend create (ChamaService.create_chama) does:

Create member (from payload) when member is sent
Create chama
Create ACTIVE membership for that member
Assign CHAIRPERSON + MEMBER roles
Seed chart of accounts
Only if user.member_id is None: set user.member_id = member.id
commit()

Likely root causes (ordered)
A. User already has member_id (high probability for re-tests)
If the logged-in user already has member_id set (previous Chama / member-link / earlier create):

Create still builds a new member from the form (data.member).
Membership is attached to the new member.
user.member_id is not updated (guard: if user.member_id is None).
GET /chamas/{id} authorizes with the old member_id → no ACTIVE membership on the new Chama → 403 → exact UI error.

B. First-time user: member_id not visible on next request (medium)
If link + commit failed or the user row was not flushed, the next GET still sees member_id is None → same 403. Less likely if SQLAlchemy session is standard, but worth verifying in Network tab (create 201, then get 403 + body).
C. Frontend-only issues (lower, but fix anyway)

After create, UI always re-fetches GET /chamas/{id} instead of trusting the create response for first paint.
No “my chamas” API → recovery depends on localStorage only.
Error copy says “no longer available” even on first load failure (misleading).

Recommended fixes
Frontend (do these regardless)

After successful create
Call setActiveChama(chama.id).
Prefer seeding context with the create response (ChamaOut) so the shell does not block on an immediate GET.
Still refetch in background; on 403, show a precise message (membership link failed), not “no longer available”.

On 403 from getChama right after create
Suggest re-login or “refresh session” so member_id is reloaded.
Offer “Choose another Chama” / clear active id (already present).

Error copy
Distinguish: “Access denied (not an active member)” vs true not-found.

If product needs multi-Chama discovery without localStorage → backend gap report for GET /api/v1/chamas (mine).

Backend (preferred correctness)

On create, membership member and user.member_id must be the same person:
If user.member_id is already set: do not create a second member from the form for the creator path; use the linked member (or reject conflicting identity with 409).
If user.member_id is None: create member, set user.member_id, create membership for that member (current intent).

Optionally return a richer create payload (e.g. membership id / roles) — not required if (1) is fixed.
Consider GET /api/v1/chamas for the current user’s ACTIVE memberships (file gap doc if deferred).

How to verify the bug in 5 minutes

New user: register → login → create Chama with new phone + government id.
DevTools Network:
POST /api/v1/chamas → 201
GET /api/v1/chamas/{id} → 403 or 200?

Repeat create with same user and new identity fields (or second Chama) → likely 403 if cause A.
Backend DB: check users.member_id vs memberships.member_id for that chama.


4. Suggested developer tasks (ordered)

Reproduce create → GET chain; confirm 403 body.
Backend: fix creator membership / user.member_id consistency on POST /chamas.
Frontend: optimistic active Chama from create response; improve 403 messaging.
Smoke: register → create → dashboard → members → contribution confirm → ledger balances.
If “list my chamas” is required, add docs/BACKEND_GAP_list_my_chamas.md and implement on backend.
Refresh README with setup (NEXT_PUBLIC_API_BASE_URL, backend CORS, npm run dev).


5. Summary





























ItemStatusFrontend feature coverageHigh (~Phases 0–6 UI present)Production-ready polishMedium (docs, QA, bug below)Blocker for first-run UXYes — post-create “not an active member”Most likely causeCreator membership not tied to users.member_id when user already linked, or GET runs before link is usableProcess for missing backendWrite docs/BACKEND_GAP_*.md; do not invent APIs
Bottom line: The frontend has moved from planning to a broad working UI. The create-Chama → access denied path should be fixed next (backend membership link + frontend error/optimistic state). Any missing backend list/detail contracts should be recorded under docs/BACKEND_GAP_*.md instead of guessed in the client.
