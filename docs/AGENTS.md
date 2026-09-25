# AGENTS.md — ChamaCore Frontend

**Repo:** https://github.com/Thorium234/chamacore-frontend  
**Backend:** https://github.com/Thorium234/Chamacore  
**Stack:** Next.js (App Router) + TypeScript + Axios  

Read this file **before every change**. Do not guess API behaviour.

Also read:

- `docs/FRONTEND_SPEC.md` — product and architecture rules  
- `docs/API_MAP.md` — endpoint paths and auth notes  
- Backend `docs/06_API_CONTRACT.md` and live `/docs` when `CHAMACORE_DEBUG=true`
- `docs/BACKEND_GAP_chama_create_for_existing_member.md` — confirmed backend hole: chama create for an already-linked user 403s on the new Chama. Do not re-guess a client-side fix.

---

## 1. Mission

Build a **consumer UI** for the existing ChamaCore FastAPI backend.

- Backend owns authz, money, ledger, idempotency, and business rules.
- Frontend displays data and sends allowed actions only.
- Never invent endpoints, payloads, statuses, or balances in the browser.

---

## 2. Non-negotiable rules

1. **Source of truth**  
   API paths and bodies come from the backend contract / OpenAPI.  
   Do not invent routes such as guessed `/loans` paths until confirmed in backend `/docs`.

2. **No client-side financial truth**  
   Use `GET /api/v1/chamas/{chama_id}/ledger/accounts` for balances.  
   Do not sum contributions in the browser and call that “Cash balance”.

3. **Auth**  
   - Register: `POST /api/v1/auth/register` JSON `{ email, password }`  
   - Login: `POST /api/v1/auth/token` **form-urlencoded** `username` (email) + `password`  
   - Refresh: `POST /api/v1/auth/refresh` JSON `{ refresh_token }`  
   - Logout: `POST /api/v1/auth/logout` JSON `{ refresh_token }` → 204  
   - Me: `GET /api/v1/auth/me` with `Authorization: Bearer <access_token>`  
   - Member link: `POST /api/v1/auth/me/member-link` JSON `{ phone_number, government_id }`  

4. **Token response shape**  
   `{ access_token, refresh_token, token_type, expires_in }`  
   Default access lifetime ~120 minutes (`expires_in` in seconds).

5. **401 handling**  
   One refresh attempt (single-flight if many requests fail).  
   On refresh failure: clear session → redirect to login.  
   No infinite refresh loops.

6. **CORS**  
   Backend `CHAMACORE_CORS_ORIGINS` must include the frontend origin.  
   Defaults: `http://localhost:3000`, `http://localhost:5173`.  
   Frontend env: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`.

7. **Secrets**  
   Never commit JWT secrets, Daraja keys, DB URLs, or payment credentials.  
   Only `NEXT_PUBLIC_*` vars in the frontend.

8. **Idempotency**  
   Payment intents require `idempotency_key`. One key per user action; reuse on retry.

9. **Double submit**  
   Disable submit while pending; backend idempotency is still required for money ops.

10. **Chama context**  
    Keep an explicit active `chama_id`. On switch, invalidate Chama-scoped cache/queries.

11. **Errors**  
    Prefer `{ detail: { code, message } }` or string `detail`.  
    Handle 403, 409, 422, 429 explicitly in UI.

12. **Webhooks**  
    C2B validate/confirm and STK callbacks are **server-to-server**. Never implement them in the SPA.

---

## 3. Stack

| Item | Choice |
|------|--------|
| Framework | Next.js App Router |
| Language | TypeScript (strict) |
| HTTP | **Axios only** — one shared client |
| Env | `NEXT_PUBLIC_API_BASE_URL` |

Do not scatter raw `fetch()` across pages.  
Path: UI → hooks/features → `src/lib/api/*` → `client.ts` → backend.

---

## 4. Suggested layout

```text
src/
  app/
    (auth)/login|register
    (app)/dashboard|members|contributions|ledger|payments|...
  lib/api/client.ts
  lib/api/auth.ts
  lib/api/chamas.ts
  lib/api/memberships.ts
  lib/api/contributions.ts
  lib/api/ledger.ts
  lib/api/payments.ts
  lib/auth/token-store.ts
  types/api.ts
docs/
  AGENTS.md
  FRONTEND_SPEC.md
  API_MAP.md
  PHASES.md
  SETUP.md
