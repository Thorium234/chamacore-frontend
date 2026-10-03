"use client";

import { useEffect, useRef } from "react";

import { invalidate, refetchEntry } from "@/lib/query/cache";
import { moneyScopeKeys } from "@/lib/query/money-scope";
import type { PaymentIntentOut } from "@/types/api";

const STATUS_REFRESH_MS = 15_000;

/** Poll in-flight intents and refresh financial views once the API reports success. */
export function usePaymentSettlementRefresh(
  chamaId: string | null,
  intents: PaymentIntentOut[],
  queryKey?: string
): void {
  const refreshedSuccessIds = useRef(new Set<string>());

  useEffect(() => {
    if (!chamaId) return;
    const newlySucceeded = intents.filter(
      (intent) =>
        intent.status === "SUCCEEDED" && !refreshedSuccessIds.current.has(intent.id)
    );
    if (newlySucceeded.length === 0) return;

    for (const intent of newlySucceeded) refreshedSuccessIds.current.add(intent.id);
    for (const key of moneyScopeKeys(chamaId)) invalidate(key);
  }, [chamaId, intents]);

  useEffect(() => {
    if (!chamaId || !intents.some((intent) => intent.status === "PROCESSING")) return;

    const timer = window.setInterval(() => {
      if (!document.hidden) refetchEntry(queryKey ?? `${chamaId}:payment-intents`);
    }, STATUS_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [chamaId, intents, queryKey]);
}
