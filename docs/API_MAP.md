
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

Ledger is the only paginated list with `next_cursor` / `has_more`. Contributions, loans, payouts, and payment intents list endpoints do NOT return page envelopes yet — do not assume one.
