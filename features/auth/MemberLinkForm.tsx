"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { useSession } from "@/features/auth/session";
import { getErrorMessage, toApiError } from "@/lib/api/errors";

export function MemberLinkForm() {
  const { linkMember } = useSession();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [governmentId, setGovernmentId] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setIsPending(true);
    setError(null);
    try {
      await linkMember({
        phone_number: phoneNumber.trim(),
        government_id: governmentId.trim(),
      });
    } catch (err) {
      setError(getErrorMessage(toApiError(err)));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? (
        <Alert title="Could not link your account">{error}</Alert>
      ) : null}
      <p className="text-sm text-zinc-500">
        Link your account to the member record this Chama has for you. The phone
        number and government ID must match what leadership entered when they
        added you.
      </p>
      <Input
        label="Phone number"
        required
        type="tel"
        value={phoneNumber}
        onChange={(event) => setPhoneNumber(event.target.value)}
        placeholder="+2547XXXXXXXX"
      />
      <Input
        label="Government ID"
        required
        value={governmentId}
        onChange={(event) => setGovernmentId(event.target.value)}
      />
      <Button type="submit" loading={isPending}>
        Link my account
      </Button>
    </form>
  );
}