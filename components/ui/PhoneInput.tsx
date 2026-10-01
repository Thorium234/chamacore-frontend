"use client";

import { Input } from "@/components/ui/Field";
import {
  isLikelyKenyanPhone,
  normalizePhone,
  PHONE_HINT,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";

/**
 * Phone input that previews the canonical form the backend will store.
 *
 * The backend normalizes Kenyan numbers on write (`app/core/phone.py`), so a
 * user typing `0712 345 678` ends up with `254712345678` on record. Showing the
 * normalized value as they type removes the surprise of a member list that no
 * longer matches what leadership typed. We send the raw input and let the API
 * normalize — this is preview only, never a client-side source of truth.
 */
export function PhoneInput({
  label = "Phone number",
  value,
  onChange,
  hint,
  error,
  id,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string | null;
  id?: string;
}) {
  const normalized = value.trim() ? normalizePhone(value) : "";
  const looksValid = value.trim() === "" || isLikelyKenyanPhone(value);

  return (
    <>
      <Input
        label={label}
        required
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={PHONE_PLACEHOLDER}
        hint={hint ?? PHONE_HINT}
        error={error ?? (looksValid ? null : "That does not look like a Kenyan mobile number.")}
      />
      {normalized && looksValid ? (
        <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Will be stored as <span className="font-mono">{normalized}</span>
        </p>
      ) : null}
    </>
  );
}
