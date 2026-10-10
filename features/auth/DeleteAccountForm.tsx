"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toApiError, getErrorMessage } from "@/lib/api/errors";

export function DeleteAccountForm() {
  const { deleteAccount } = useSession();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setError("Please enter your password to confirm account deletion.");
      return;
    }
    setError(null);
    setShowConfirm(true);
  }

  async function handleConfirmDelete() {
    setShowConfirm(false);
    setIsPending(true);
    setError(null);
    try {
      await deleteAccount(password);
      router.replace("/login");
    } catch (err) {
      setError(getErrorMessage(toApiError(err)));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Alert tone="info" title="Irreversible Action">
        <p>
          Deleting your account deactivates your credentials and ends all active sessions immediately.
          In accordance with Kenyan financial regulatory obligations and data retention policies, your
          contributions, shares, and immutable double-entry ledger history remain permanently preserved.
        </p>
      </Alert>

      {error ? (
        <Alert className="mt-3" title="Could not delete account">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Confirm Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your current password"
          hint="Re-enter your password to authorize permanent deactivation."
        />

        <Button type="submit" variant="danger" loading={isPending}>
          Delete My Account
        </Button>
      </form>

      <ConfirmDialog
        open={showConfirm}
        title="Permanently Deactivate Account?"
        description="Are you sure you want to delete your account? All active sessions will be terminated immediately, and you will not be able to sign back in."
        confirmLabel="Yes, Delete My Account"
        tone="danger"
        isPending={isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setShowConfirm(false)}
      />
    </div>
  );
}
