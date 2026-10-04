"use client";

import { useState, type FormEvent } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { useSession } from "@/features/auth/session";
import { createChama } from "@/lib/api/chamas";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Alert } from "@/components/ui/Alert";
import { toApiError, getErrorMessage } from "@/lib/api/errors";
import type { ChamaOut } from "@/types/api";

export function CreateChamaForm({ onCreated }: { onCreated?: (chama: ChamaOut) => void }) {
  const { seedActiveChama } = useChama();
  const { user } = useSession();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [registrationFee, setRegistrationFee] = useState("0.00");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [governmentId, setGovernmentId] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);

    if (!/^\d+(\.\d{1,2})?$/.test(registrationFee)) {
      setError("Registration fee must be an amount with up to two decimals.");
      return;
    }

    setIsPending(true);
    try {
      const chama = await createChama({
        name: name.trim(),
        description: description.trim() || null,
        registration_fee_amount: registrationFee,
        ...(user?.member_id
          ? {}
          : {
              member: {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                phone_number: phoneNumber.trim(),
                government_id: governmentId.trim(),
              },
            }),
      });
      seedActiveChama(chama);
      onCreated?.(chama);
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.status === 409) {
        setError(
          "A member with these identity details already exists, or you are already linked to another Chama."
        );
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
        <Alert title="Could not create the Chama">{error}</Alert>
      ) : null}

      <div className="space-y-4">
        <Input
          label="Chama name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Umoja Self-Help Group"
        />
        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
        />
        <Input
          label="Registration fee (KES)"
          hint="Amount each new member owes on joining; 0.00 if none."
          required
          inputMode="decimal"
          value={registrationFee}
          onChange={(event) => setRegistrationFee(event.target.value)}
        />
      </div>

      {!user?.member_id ? <fieldset className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Your member details
        </legend>
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
          placeholder="National ID / passport number"
        />
      </fieldset> : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your account details will be used to create your owner and chairperson membership.
        </p>
      )}

      <Button type="submit" className="w-full" loading={isPending}>
        Create Chama
      </Button>
    </form>
  );
}
