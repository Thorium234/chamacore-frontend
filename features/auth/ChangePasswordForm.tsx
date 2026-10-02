"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { getErrorMessage, toApiError } from "@/lib/api/errors";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Password change, used both as a voluntary action and as the forced gate when
 * `must_change_password` is set.
 *
 * On success the session ends (the backend revoked every refresh token), so we
 * send the user to the login page with a confirmation rather than pretending
 * they are still signed in.
 */
export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const { changePassword } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("The new password must be different from your current one.");
      return;
    }

    setIsPending(true);
    try {
      await changePassword(currentPassword, newPassword);
      router.replace("/login?password_changed=1");
    } catch (err) {
      const apiError = toApiError(err);
      setError(
        apiError.status === 400
          ? apiError.message
          : getErrorMessage(apiError)
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? (
        <Alert title="Could not change your password">{error}</Alert>
      ) : null}

      {forced ? (
        <Alert tone="info" title="Set a new password to continue">
          An administrator asked you to choose a new password. You will be signed in again once
          you do.
        </Alert>
      ) : null}

      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        required
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
      />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. Changing it signs you out everywhere.`}
      />
      <Input
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />

      <Button type="submit" className="w-full" loading={isPending}>
        Change password
      </Button>
    </form>
  );
}