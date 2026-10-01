/**
 * Kenyan mobile number helpers — display only.
 *
 * This mirrors the backend's canonical write/lookup form
 * (`app/core/phone.py::normalize_ke_msisdn`) so the UI can show the user what
 * will actually be stored, before they submit. The backend remains the
 * authority: it normalizes again on write and matches identity lookups across
 * phone variants, so a value sent from here is never trusted.
 *
 * Display mirroring rules:
 *   07XXXXXXXX  -> 2547XXXXXXXX
 *   7XXXXXXXX   -> 2547XXXXXXXX
 *   011XXXXXXXX -> 25411XXXXXXXX (kept; not a Safaricom prefix)
 *   +2547...    -> 2547...     (unchanged)
 */

const NON_DIGIT = /\D/g;

/**
 * Digit-only form folded to the `254...` international shape, exactly as the
 * backend does. Non-dialable input is returned digit-only, matching the
 * backend's lenient handling.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(NON_DIGIT, "");
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

/**
 * True when the value is a plausible Kenyan mobile number: the backend's own
 * normalized shape (254 + 9 digits, Safaricom-style `7` or `11` prefix).
 * Used for client-side guidance only — the API still validates and may reject.
 */
export function isLikelyKenyanPhone(raw: string): boolean {
  const digits = normalizePhone(raw);
  if (!/^254\d{9}$/.test(digits)) return false;
  const national = digits.slice(3);
  return national.startsWith("7") || national.startsWith("11");
}

/**
 * Human-readable rendering of a stored phone number, e.g. `254712345678` ->
 * `0712 345 678`. Falls back to the raw string for anything unrecognized so we
 * never mangle a value the backend gave us, and to an em dash when the member
 * record simply has no number.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "—";
  const digits = raw.replace(NON_DIGIT, "");
  if (/^2547\d{8}$/.test(digits)) {
    return `0${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  if (/^2541\d{8}$/.test(digits)) {
    return `0${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return raw;
}

/** Placeholder shown in phone inputs, matching the stored canonical form. */
export const PHONE_PLACEHOLDER = "0712 345 678";

/** Hint text explaining the normalization to the user. */
export const PHONE_HINT = "Kenyan number. Stored as 2547… — you can enter 07…, 7… or +2547….";
