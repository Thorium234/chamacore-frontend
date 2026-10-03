"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { toApiError, getErrorMessage } from "@/lib/api/errors";

export function LoginForm() {
  const { login } = useSession();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const passwordChanged = searchParams.get("password_changed") === "1";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setIsPending(true);
    try {
      // Sent as the OAuth2 `username` form field. The backend resolves it as
      // email, then phone, then government ID
      // (`app/services/auth.py::authenticate`), so the field name on the wire
      // is unchanged even though what it accepts has widened.
      await login(identifier.trim(), password);
    } catch (err) {
      setError(getErrorMessage(toApiError(err)));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      noValidate
    >
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Use the email, phone number or national ID on your member record, with your password.
      </p>

      {justRegistered ? (
        <Alert tone="success" className="mt-4" title="Account created">
          You can now sign in with your new account, then create a Chama or link the member record
          leadership added for you.
        </Alert>
      ) : null}

      {passwordChanged ? (
        <Alert tone="success" className="mt-4" title="Password changed">
          Your password was updated and every other session was signed out. Sign in again with your
          new password.
        </Alert>
      ) : null}

      {error ? (
        <Alert className="mt-4" title="Unable to sign in">
          {error}
        </Alert>
      ) : null}

      <div className="mt-5 space-y-4">
        <Input
          label="Email, phone or national ID"
          type="text"
          autoComplete="username"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="you@example.com or 0712 345 678"
          hint="Phone and national ID sign-in only work once leadership has linked your member record."
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
      </div>

      <Button type="submit" className="mt-6 w-full" loading={isPending}>
        Sign in
      </Button>

      <p className="mt-4 text-center text-sm text-zinc-500">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
          Register
        </Link>
      </p>
    </form>
  );
}