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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setIsPending(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(getErrorMessage(toApiError(err)));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      noValidate
    >
      <h1 className="text-lg font-semibold text-zinc-900">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Use the email and password for your ChamaCore account.
      </p>

      {justRegistered ? (
        <Alert tone="success" className="mt-4" title="Account created">
          You can now sign in with your new account.
        </Alert>
      ) : null}

      {error ? (
        <Alert className="mt-4" title="Unable to sign in">
          {error}
        </Alert>
      ) : null}

      <div className="mt-5 space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
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