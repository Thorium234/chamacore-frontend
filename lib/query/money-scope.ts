/**
 * Cache-key scopes for money-moving data.
 *
 * `invalidate(prefix)` matches a key exactly or any key that starts with
 * `prefix + ":"`, so one prefix per resource refreshes all of its paged and
 * nested variants (`ledger` covers `ledger:accounts` and
 * `ledger:accounts:{id}:entries:25`, and so on).
 *
 * Use `moneyScopeKeys` after any action that can change money state so the
 * trust-the-money-path rule holds: once a payment settles, contributions,
 * shares and ledger balances on screen are never stale.
 */

/**
 * Chama-scoped resources whose contents change when money moves — a confirmed
 * or reversed contribution, a settled STK/C2B payment, or a manual entry.
 *
 * `memberships` is included because membership carries the registration-fee
 * state and the caller's own roles, which money actions can settle.
 */
export function moneyScopeKeys(chamaId: string): string[] {
  return [
    `${chamaId}:contributions`,
    `${chamaId}:shares`,
    `${chamaId}:ledger`,
    `${chamaId}:payment-intents`,
    `${chamaId}:audit-events`,
    `${chamaId}:memberships`,
  ];
}

/**
 * Read-only group-wide views (transparency). Any active member may read these,
 * and they all reflect settled money, so they refresh together.
 */
export function transparencyScopeKeys(chamaId: string): string[] {
  return [
    `${chamaId}:contributions`,
    `${chamaId}:shares`,
    `${chamaId}:ledger`,
    `${chamaId}:memberships`,
  ];
}
