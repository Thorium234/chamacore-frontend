"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Alert } from "@/components/ui/Alert";
import { useChama } from "@/features/chamas/ChamaContext";
import { useMutation } from "@/lib/query/hooks";
import { createMembership } from "@/lib/api/memberships";

export function AddMemberForm() {
  const { activeChamaId } = useChama();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [governmentId, setGovernmentId] = useState("");
  const [email, setEmail] = useState("");

  const { mutate, isPending, error, reset } = useMutation(
    async () => {
      if (!activeChamaId) throw new Error("No active Chama");
      return createMembership(activeChamaId, {
        member: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim(),
          government_id: governmentId.trim(),
          email: email.trim(),
        },
      });
    },
    { invalidates: activeChamaId ? [`${activeChamaId}:memberships`] : [] }
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || !activeChamaId) return;
    const result = await mutate();
    if (result) {
      reset();
      setFirstName("");
      setLastName("");
      setPhoneNumber("");
      setGovernmentId("");
      setEmail("");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? (
        <Alert title="Could not add the member">{error.message}</Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="First name"
          required
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <Input
          label="Last name"
          required
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
      </div>
      <PhoneInput value={phoneNumber} onChange={setPhoneNumber} />
      <Input
        label="Government ID"
        required
        value={governmentId}
        onChange={(event) => setGovernmentId(event.target.value)}
      />
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="member@example.com"
      />
      <Alert tone="info" title="Member login will be created">
        They can sign in with this email, their phone number, or government ID. Their government ID
        will be the temporary password, and they will be required to change it at first sign-in.
      </Alert>

      <Button type="submit" loading={isPending}>
        Add member
      </Button>
    </form>
  );
}
