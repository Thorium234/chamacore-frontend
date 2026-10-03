/**
 * Client mirror of the server password policy — UX only, never the authority.
 *
 * Mirrors `app/core/password_policy.py` (backend commit `fb0956e`) so the user
 * sees what will fail before spending a round trip. The server remains the
 * only enforcement point, and its message wins whenever the two disagree.
 *
 * Deliberate omissions, because the server does not implement them:
 *   - similarity / sequence / keyboard-walk / leet checks — none exist
 *   - "must not be the same as your phone number" — `validate_password` is only
 *     ever called without `phone=`, so that rule is unreachable. Showing it
 *     would warn about something that can never happen.
 */

export const PASSWORD_MIN_LENGTH = 10;

/** Pydantic `max_length` on `password` / `new_password` (`schemas/user.py`). */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Exactly the server's `COMMON_PASSWORDS` set. Kept verbatim and in the same
 * case-folding form the server compares against, so the two agree.
 */
const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "qwerty123",
  "admin123",
  "letmein123",
  "welcome123",
  "changeme123",
  "1234567890",
  "12345678",
  "password1",
  "abc123456",
  "secret123",
]);

/**
 * The five messages the server can emit, reproduced byte-for-byte so the
 * checklist never contradicts the API response. `phone` is excluded because
 * the server cannot currently raise it.
 */
export const PASSWORD_POLICY_MESSAGES = {
  length: "Password must be at least 10 characters long",
  complexity:
    "Password must include at least one uppercase letter, one lowercase letter, one digit, and one symbol",
  common: "Password is too common",
  matchesEmail: "Password must not be the same as your email",
} as const;

const HAS_UPPER = /[A-Z]/;
const HAS_LOWER = /[a-z]/;
const HAS_DIGIT = /\d/;
/** Server-side `_has_symbol` is `re.search(r"[^A-Za-z0-9]", ...)`. */
const HAS_SYMBOL = /[^A-Za-z0-9]/;

export interface PasswordCheck {
  /** Human-readable unmet rules, in the order the server reports them. */
  violations: string[];
  /** Per-rule booleans, for a live checklist that ticks as you type. */
  rules: {
    length: boolean;
    upper: boolean;
    lower: boolean;
    digit: boolean;
    symbol: boolean;
    common: boolean;
    matchesEmail: boolean;
  };
}

/**
 * Evaluate a candidate password against the mirrored policy.
 *
 * `email` enables the "same as your email" rule, mirroring the server's
 * case-insensitive exact comparison. A blank email skips it, which is what an
 * unauthenticated change-password form effectively sees.
 */
export function checkPassword(password: string, email?: string | null): PasswordCheck {
  const rules = {
    length: password.length >= PASSWORD_MIN_LENGTH,
    upper: HAS_UPPER.test(password),
    lower: HAS_LOWER.test(password),
    digit: HAS_DIGIT.test(password),
    symbol: HAS_SYMBOL.test(password),
    common: !COMMON_PASSWORDS.has(password.toLowerCase()),
    matchesEmail: !(email ? password.toLowerCase() === email.toLowerCase() : false),
  };

  // Same accumulation order as `validate_password`, so the joined string reads
  // identically to the server's `"; "`-joined `detail.message`.
  const violations: string[] = [];
  if (!rules.length) violations.push(PASSWORD_POLICY_MESSAGES.length);
  if (!(rules.upper && rules.lower && rules.digit && rules.symbol)) {
    violations.push(PASSWORD_POLICY_MESSAGES.complexity);
  }
  if (!rules.common) violations.push(PASSWORD_POLICY_MESSAGES.common);
  if (!rules.matchesEmail) violations.push(PASSWORD_POLICY_MESSAGES.matchesEmail);

  return { violations, rules };
}

/**
 * Split a `PASSWORD_POLICY_VIOLATION` message back into its parts.
 *
 * The backend returns ONE `detail.message` joined with `"; "` and no `errors`
 * array (`app/core/password_policy.py`), so the list has to be recovered by
 * splitting. Anything that is not a recognised segment is passed through
 * untouched rather than dropped, so a future server rule still reaches the user.
 */
export function splitPolicyMessage(message: string): string[] {
  return message
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}