import type { PasswordCheck } from "@/lib/password-policy";
import { PASSWORD_POLICY_MESSAGES } from "@/lib/password-policy";

const CHECKS: Array<{ key: keyof PasswordCheck["rules"]; label: string }> = [
  { key: "length", label: PASSWORD_POLICY_MESSAGES.length },
  { key: "upper", label: "Include an uppercase letter" },
  { key: "lower", label: "Include a lowercase letter" },
  { key: "digit", label: "Include a digit" },
  { key: "symbol", label: "Include a symbol" },
  { key: "common", label: PASSWORD_POLICY_MESSAGES.common },
  { key: "matchesEmail", label: PASSWORD_POLICY_MESSAGES.matchesEmail },
];

export function PasswordChecklist({
  check,
  passwordsMatch,
}: {
  check: PasswordCheck;
  passwordsMatch?: boolean;
}) {
  return (
    <ul className="-mt-2 space-y-1 text-xs" aria-live="polite">
      {CHECKS.map(({ key, label }) => {
        const met = check.rules[key];
        return (
          <li
            key={key}
            className={met ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500"}
          >
            <span aria-hidden="true">{met ? "✓" : "○"}</span> {label}
          </li>
        );
      })}
      {passwordsMatch === false ? (
        <li className="text-amber-700 dark:text-amber-400">The two new passwords do not match</li>
      ) : null}
    </ul>
  );
}
