
---

### `docs/API_MAP.md`

```markdown
# API Map — ChamaCore Frontend

**Base:** `{NEXT_PUBLIC_API_BASE_URL}`  
**Prefix:** `/api/v1`  

Authoritative source: backend docs/06_API_CONTRACT.md and live OpenAPI at `/docs` when backend `CHAMACORE_DEBUG=true`.

Authenticated routes need:

```http
Authorization: Bearer <access_token>
```

## Confirmed endpoints used by the SPA

| Method | Path | Notes |
|--------|------|-------|
| GET | /chamas | My Chamas (ACTIVE memberships only) |
| GET | /chamas/{id}/audit-events | `?limit` (1..500) & `offset`; bare list, no page envelope |
| GET | /chamas/{id}/memberships/{membership_id}/registration-fee/payments | Fee payment history (CONFIRMED / REVERSED) |
| POST | /chamas/{id}/statements | `?from` & `to` (ISO dates) & `membership_id`; returns an `application/pdf` blob. `membership_id` omitted = caller only, for chair/treasurer `all` = whole Chama. No JSON variant. |
| GET | /notifications | `?unread_only` & `limit` & `offset` & `chama_id` |
| GET | /notifications/unread-count | `{ unread_count }` |
| POST | /notifications/{id}/read | 204 |
| POST | /notifications/read-all | 204; accepts optional `chama_id` |
| DELETE | /notifications/{id} | 204 |
| GET | /platform/stats | Platform admins only (403 otherwise). Doubles as the caller-role probe — see `features/platform/usePlatformAdmin.ts` |
| GET | /platform/chamas | Platform admins only |
| PATCH | /platform/chamas/{id}/status | Platform admins only. **PATCH**, not POST |
| GET | /platform/users | Platform admins only |
| POST | /platform/users/{id}/roles | Grant `PLATFORM_ADMIN` (global role, not a Chama membership role) |
| DELETE | /platform/users/{id}/roles | Revoke it |
| POST | /platform/users/{id}/require-password-change | `?reason` (audited) |
| POST | /auth/change-password | `{ current_password, new_password }` → `UserOut`. Revokes all refresh tokens; the current access token survives. No server-side dependency enforces `must_change_password`, so the SPA gates on it |

Ledger is the only paginated list with `next_cursor` / `has_more`. Contributions, loans, payouts, and payment intents list endpoints do NOT return page envelopes yet — do not assume one.
