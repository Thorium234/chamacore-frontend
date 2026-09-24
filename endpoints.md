1. Auth
Method,Path,Body / notes,Auth
POST,/api/v1/auth/register,"JSON { ""email"", ""password"" } → 201",No
POST,/api/v1/auth/token,"Form username=email, password → TokenOut",No
POST,/api/v1/auth/refresh,"JSON { ""refresh_token"" } → TokenOut",No
POST,/api/v1/auth/logout,"JSON { ""refresh_token"" } → 204",No
GET,/api/v1/auth/me,→ current user,Yes
POST,/api/v1/auth/me/member-link,"JSON { ""phone_number"", ""government_id"" }",Yes

2. TokenOut
JSON{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 7200
}
Login must use Content-Type: application/x-www-form-urlencoded, not JSON.

3. Chamas
   Method,Path,Notes
POST,/api/v1/chamas,Creates Chama + creator member + CHAIRPERSON
GET,/api/v1/chamas/{chama_id},Active membership required
PATCH,/api/v1/chamas/{chama_id},Chairperson only
4. Create body:
   {
  "name": "...",
  "registration_fee_amount": "100.00",
  "member": {
    "first_name": "...",
    "last_name": "...",
    "phone_number": "...",
    "government_id": "..."
  }
}
5.Memberships
Method,Path,Notes
POST,/api/v1/chamas/{chama_id}/memberships,Chair / Treasurer / Secretary
GET,/api/v1/chamas/{chama_id}/memberships,List
PATCH,/api/v1/chamas/{chama_id}/memberships/{membership_id}/status,Chair; ACTIVE | INACTIVE
6. Roles
   Method,Path,Notes
GET,/api/v1/chamas/{chama_id}/roles,Available roles
POST,/api/v1/chamas/{chama_id}/memberships/{membership_id}/roles,"Chair; { ""role"": ""TREASURER"" | ""SECRETARY"" }"
DELETE,/api/v1/chamas/{chama_id}/memberships/{membership_id}/roles/{role_name},Chair
7.Registration fees
Method,Path,Notes
GET,/api/v1/chamas/{chama_id}/memberships/{membership_id}/registration-fee,
POST,/api/v1/chamas/{chama_id}/memberships/{membership_id}/registration-fee/waive,Chair
8. Contributions
   Method,Path,Notes
POST,/api/v1/chamas/{chama_id}/contributions,"Chair/Treasurer; { membership_id, amount, period }"
GET,/api/v1/chamas/{chama_id}/contributions,List
POST,/api/v1/chamas/{chama_id}/contributions/{contribution_id}/confirm,Chair
POST,/api/v1/chamas/{chama_id}/contributions/{contribution_id}/reverse,Chair

Statuses: PENDING | CONFIRMED | REVERSED.

Period: YYYY-MM.
9. Shares
Method,Path,Notes
GET,/api/v1/chamas/{chama_id}/memberships/{membership_id}/shares,
10.Ledger
Method,Path,Notes
GET,/api/v1/chamas/{chama_id}/ledger,"History; limit, cursor"
GET,/api/v1/chamas/{chama_id}/ledger/accounts,Accounts + balance
GET,/api/v1/chamas/{chama_id}/ledger/accounts/{account_id}/entries,"limit, cursor"
No public ledger write API.
11.Payments
Connections
Method,Path
POST,/api/v1/chamas/{chama_id}/payment-connections
GET,/api/v1/chamas/{chama_id}/payment-connections
GET,/api/v1/chamas/{chama_id}/payment-connections/{connection_id}
POST,/api/v1/chamas/{chama_id}/payment-connections/{connection_id}/validate
PATCH,/api/v1/chamas/{chama_id}/payment-connections/{connection_id}
POST,/api/v1/chamas/{chama_id}/payment-connections/{connection_id}/disable
DELETE,/api/v1/chamas/{chama_id}/payment-connections/{connection_id}
POST,/api/v1/chamas/{chama_id}/payment-connections/{connection_id}/register-c2b-urls
12.IntentMethod,Path,Notes
POST,/api/v1/chamas/{chama_id}/payment-intents,Include idempotency_key
GET,/api/v1/chamas/{chama_id}/payment-intents,
GET,/api/v1/chamas/{chama_id}/payment-intents/{intent_id},
Not for the SPA

Webhooks
C2B validate/confirm
12. Health
Method,Path
GET,/health
GET,/ready
Loans / payouts / audit
Confirm in backend /docs before any UI.
HTTP status cheat sheet
Status,UI behaviour
401,Refresh once; else logout
403,Permission denied
404,Not found
409,Conflict / invalid state
422,Validation errors
429,Rate limited


