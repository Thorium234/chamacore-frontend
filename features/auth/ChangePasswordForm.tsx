"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { PasswordChecklist } from "@/features/auth/PasswordChecklist";
import { getErrorMessage, toApiError } from "@/lib/api/errors";
import {
  checkPassword,
  PASSWORD_MAX_LENGTH,
  splitPolicyMessage,
} from "@/lib/password-policy";

/**
 * Password change, used both as a voluntary action and as the forced gate when
 * `must_change_password` is set.
 *
 * The endpoint keeps the session alive (it revokes no tokens as of `6f56d9c`),
 * so on success the user simply continues in the app — the gate lifts because
 * `useSession` re-read `/auth/me`.
 */
export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const { changePassword, user } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverViolations, setServerViolations] = useState<string[] | null>(null);

  // Mirrors the server exactly; the server's answer still wins on submit.
  const check = useMemo(
    () => checkPassword(newPassword, user?.email),
    [newPassword, user?.email]
  );
  const policyMet = check.violations.length === 0;
  const passwordsMatch = newPassword === confirmPassword;
  const changed = newPassword.length > 0 && newPassword !== currentPassword;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setServerViolations(null);

    if (!newPassword) return;

    if (!passwordsMatch) {
      setError("The new passwords do not match.");
      return;
    }
    if (!policyMet) {
      // Mirror the server's own wording, but let the API be the authority: this
      // only saves a round trip, it never approves a password.
      setServerViolations(check.violations);
      return;
    }

    setIsPending(true);
    try {
      await changePassword(currentPassword, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      if (forced) router.replace("/dashboard");
    } catch (err) {
      const apiError = toApiError(err);
      // `PASSWORD_POLICY_VIOLATION` arrives as `{ detail: { code, message } }`
      // with the rules joined by "; ". Re-split it so the user gets the list.
      if (apiError.code === "PASSWORD_POLICY_VIOLATION") {
        setServerViolations(splitPolicyMessage(apiError.message));
      } else if (apiError.status === 422 && apiError.issues?.length) {
        setServerViolations(
          apiError.issues.map((issue) => issue.msg)
        );
      } else if (apiError.status === 400) {
        // A bare string, e.g. "The current password is incorrect" — this path
        // loses the { code, message } envelope server-side.
        setError(apiError.message);
      } else {
        setError(getErrorMessage(apiError));
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? (
        <Alert title="Could not change your password">{error}</Alert>
      ) : null}

      {serverViolations ? (
        <Alert title="Choose a stronger password">
          <ul className="list-disc space-y-0.5 pl-4">
            {serverViolations.map((violation) => (
              <li key={violation}>{violation}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {forced ? (
        <Alert tone="info" title="Set a new password to continue">
          An administrator asked you to choose a new password before you can use ChamaCore.
        </Alert>
      ) : null}

      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={PASSWORD_MAX_LENGTH}
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
      />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        maxLength={PASSWORD_MAX_LENGTH}
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
      />
      {newPassword.length > 0 ? (
        <PasswordChecklist check={check} passwordsMatch={passwordsMatch} />
      ) : (
        <p className="text-xs text-zinc-500">
          At least 10 characters, with an uppercase letter, a lowercase letter, a digit and a
          symbol.
        </p>
      )}
      <Input
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        maxLength={PASSWORD_MAX_LENGTH}
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
      {newPassword.length > 0 && !passwordsMatch ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          The two new passwords do not match.
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        loading={isPending}
        disabled={!currentPassword || !changed || !policyMet || !passwordsMatch}
      >
        Change password
      </Button>
    </form>
  );
}
