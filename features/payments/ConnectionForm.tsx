"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { useChama } from "@/features/chamas/ChamaContext";
import { useMutation } from "@/lib/query/hooks";
import { createPaymentConnection } from "@/lib/api/payments";
import { getErrorMessage, toApiError } from "@/lib/api/errors";
import type { PaymentEnvironment, PaymentProviderCode } from "@/types/api";

export function ConnectionForm() {
  const { activeChamaId } = useChama();
  const chamaId = activeChamaId;

  const [provider, setProvider] = useState<PaymentProviderCode>("DARAJA");
  const [environment, setEnvironment] = useState<PaymentEnvironment>("SANDBOX");

  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [passkey, setPasskey] = useState("");

  const [apiKey, setApiKey] = useState("");
  const [merchantCode, setMerchantCode] = useState("");
  const [signingPrivateKey, setSigningPrivateKey] = useState("");

  const { mutate, isPending, error, reset } = useMutation(
    async () => {
      if (!chamaId) throw new Error("No active Chama");
      return createPaymentConnection(chamaId, {
        provider_code: provider,
        environment,
        credentials:
          provider === "DARAJA"
            ? {
                consumer_key: consumerKey.trim(),
                consumer_secret: consumerSecret.trim(),
                short_code: shortCode.trim(),
                passkey: passkey.trim(),
              }
            : {
                api_key: apiKey.trim(),
                merchant_code: merchantCode.trim(),
                consumer_secret: consumerSecret.trim(),
                signing_private_key: signingPrivateKey.trim() || null,
              },
      });
    },
    { invalidates: chamaId ? [`${chamaId}:payment-connections`] : [] }
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || !chamaId) return;
    const result = await mutate();
    if (result) {
      reset();
      setConsumerKey("");
      setConsumerSecret("");
      setShortCode("");
      setPasskey("");
      setApiKey("");
      setMerchantCode("");
      setSigningPrivateKey("");
    }
  }

  const secretInputProps = {
    autoComplete: "new-password" as const,
    className: "pr-0",
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? (
        <Alert title="Could not add the payment connection">
          {getErrorMessage(toApiError(error))}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Provider" value={provider} onChange={(event) => setProvider(event.target.value as PaymentProviderCode)}>
          <option value="DARAJA">Daraja (Safaricom M-Pesa)</option>
          <option value="JENGA">Jenga (Equity)</option>
        </Select>
        <Select
          label="Environment"
          value={environment}
          onChange={(event) => setEnvironment(event.target.value as PaymentEnvironment)}
        >
          <option value="SANDBOX">Sandbox (test)</option>
          <option value="PRODUCTION">Production (live money)</option>
        </Select>
      </div>

      {provider === "DARAJA" ? (
        <>
          <Input
            label="Consumer key"
            required
            type="password"
            value={consumerKey}
            onChange={(event) => setConsumerKey(event.target.value)}
            {...secretInputProps}
          />
          <Input
            label="Consumer secret"
            required
            type="password"
            value={consumerSecret}
            onChange={(event) => setConsumerSecret(event.target.value)}
            {...secretInputProps}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Short code (paybill)"
              required
              value={shortCode}
              onChange={(event) => setShortCode(event.target.value)}
            />
            <Input
              label="Passkey"
              required
              type="password"
              value={passkey}
              onChange={(event) => setPasskey(event.target.value)}
              {...secretInputProps}
            />
          </div>
        </>
      ) : (
        <>
          <Input
            label="API key"
            required
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            {...secretInputProps}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Merchant code"
              required
              value={merchantCode}
              onChange={(event) => setMerchantCode(event.target.value)}
            />
            <Input
              label="Consumer secret"
              required
              type="password"
              value={consumerSecret}
              onChange={(event) => setConsumerSecret(event.target.value)}
              {...secretInputProps}
            />
          </div>
          <Input
            label="Signing private key (PEM)"
            type="password"
            value={signingPrivateKey}
            onChange={(event) => setSigningPrivateKey(event.target.value)}
            {...secretInputProps}
            placeholder="-----BEGIN PRIVATE KEY-----…"
          />
        </>
      )}

      <p className="text-xs text-zinc-500">
        These credentials are stored encrypted on the backend and are never shown again.
        Only the account identifier remains visible.
      </p>
      <Button type="submit" loading={isPending}>
        Add connection
      </Button>
    </form>
  );
}