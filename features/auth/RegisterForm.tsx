"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { toApiError, getErrorMessage } from "@/lib/api/errors";
import { PasswordChecklist } from "@/features/auth/PasswordChecklist";
import { checkPassword, PASSWORD_MAX_LENGTH, splitPolicyMessage } from "@/lib/password-policy";

export function RegisterForm() {
  const { register } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverViolations, setServerViolations] = useState<string[] | null>(null);
  const passwordCheck = useMemo(() => checkPassword(password, email.trim()), [password, email]);
  const passwordsMatch = password === confirmPassword;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setServerViolations(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (passwordCheck.violations.length > 0) {
      setServerViolations(passwordCheck.violations);
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
      } else if (apiError.code === "PASSWORD_POLICY_VIOLATION") {
        setServerViolations(splitPolicyMessage(apiError.message));
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
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      noValidate
    >
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Create your account</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Your email and password are all we ask for now. To create a Chama you also enter your own
        member details on the next screen. Joining an existing Chama happens after you sign in.
      </p>

      {error ? (
        <Alert className="mt-4" title="Unable to register">
          {error}
        </Alert>
      ) : null}
      {serverViolations ? (
        <Alert className="mt-4" title="Choose a stronger password">
          <ul className="list-disc space-y-0.5 pl-4">
            {serverViolations.map((violation) => <li key={violation}>{violation}</li>)}
          </ul>
        </Alert>
      ) : null}

      <div className="mt-5 space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setServerViolations(null);
          }}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          maxLength={PASSWORD_MAX_LENGTH}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setServerViolations(null);
          }}
          hint="At least 10 characters, with an uppercase letter, a lowercase letter, a digit and a symbol."
        />
        {password.length > 0 ? (
          <PasswordChecklist check={passwordCheck} passwordsMatch={passwordsMatch} />
        ) : null}
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          maxLength={PASSWORD_MAX_LENGTH}
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
