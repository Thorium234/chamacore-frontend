"use client";

import type { ReactNode } from "react";

import { SessionProvider } from "@/features/auth/session";
import { ChamaProvider } from "@/features/chamas/ChamaContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ChamaProvider>{children}</ChamaProvider>
    </SessionProvider>
  );
}