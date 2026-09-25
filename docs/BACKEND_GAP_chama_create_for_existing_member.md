# BACKEND_GAP: chama create for an already-linked user

- **Date:** 2026-09-25
- **Frontend commit SHA:** fb8431e (reproduced while implementing report_01.md §3 fixes; fixes landed in a follow-up commit)

## What the UI needs

A logged-in user who already has `users.member_id` set (they created a Chama before,
or linked via `POST /auth/me/member-link`) can create **another** Chama and land
inside it. Today the create API returns 201 but the app immediately shows
"Chama access was denied" (HTTP 403) when loading the new Chama.

## What was tried

1. `POST /api/v1/chamas` with the full member payload (name, `registration_fee_amount`,
   `member: { first_name, last_name, phone_number, government_id }`) as a user whose
   `member_id` is already set → **201**, chama + membership created.
2. `GET /api/v1/chamas/{new_id}` with the same token → **403**
   "You are not an active member of this Chama".
3. `GET /api/v1/auth/me` → `member_id` still points at the **old** member.

Reproduction script (5 minutes):

```
register + login a fresh user
POST /api/v1/chamas            # chama 1 with identity A   -> 201, user.member_id = member A
POST /api/v1/chamas            # chama 2 with identity B   -> 201, ACTIVE membership on member B
GET  /api/v1/chamas/{chama2}   # same token                -> 403
GET  /api/v1/auth/me           # member_id == member A (never switches to member B)
```

## Exact error or missing contract

- `app/services/access.py` → `authorize_chama_access()` requires a row
  `(member_id, chama_id, status=ACTIVE)` where `member_id == users.member_id`.
- `ChamaService.create_chama` sets `users.member_id = member.id` **only when
  `users.member_id is None`** (guard). For an already-linked user it creates a
  brand-new member from the form payload instead of reusing the linked member,
  so the creator ends up with **no** ACTIVE membership on the new Chama.
- `ChamaCreate` schema exposes only `member` (`MemberDetails | null`); there is
  **no way** to pass an existing `member_id` or signal "create for my linked
  member" from the client. `member: null` is the only alternative and it cannot
  represent the creator membership either.

## Proposed backend change

`POST /api/v1/chamas` should reconcile the creator identity with `users.member_id`:

- If `users.member_id` is set: create the Chama and attach the ACTIVE membership
  to the **existing** linked member (ignore `member` or reject a mismatched
  identity with 409), so the creator is immediately a member of the new Chama.
- If `users.member_id` is None: keep the current behaviour (create member,
  set `users.member_id`, create membership, seed ledger, assign
  CHAIRPERSON + MEMBER).

Optional (nice-to-have): return `membership_id`/roles in the create response, and
add `GET /api/v1/chamas` (my chamas) so onboarding does not depend on localStorage.

## Workaround used in the UI

- After a successful create the shell is seeded optimistically from the create
  response (`ChamaContext.seedActiveChama`) so the first paint does not block on
  `GET /chamas/{id}`; a background re-check still runs.
- On a 403 while loading the active Chama the shell now shows a precise
  "Chama access was denied" message with **Refresh session and retry**
  (`session.refreshSession` → `GET /auth/me` → re-invalidate the Chama query)
  and **Choose another Chama** (`clearActiveChama`), instead of the misleading
  "This Chama is no longer available".

The workaround cannot fully fix the second-Chama case: only a backend change
(make create attach the creator to their existing member) restores access.