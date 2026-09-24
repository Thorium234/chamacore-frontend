"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { toApiError, getErrorMessage } from "@/lib/api/errors";

export function RegisterForm() {
  const { register } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsPending(true);
    try {
      await register({ email: email.trim(), password });
      router.replace("/login?registered=1");
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.status === 409) {
        setError("An account with that email already exists. Try signing in.");
      } else {
        setError(getErrorMessage(apiError));
      }
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
      <h1 className="text-lg font-semibold text-zinc-900">Create your account</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Register first, then you can create a Chama and become its chairperson.
      </p>

      {error ? (
        <Alert className="mt-4" title="Unable to register">
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="At least 8 characters."
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>

      <Button type="submit" className="mt-6 w-full" loading={isPending}>
        Create account
      </Button>

      <p className="mt-4 text-center text-sm text-zinc-500">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          Sign in
        </Link>
      </p>
    </form>
  );
}