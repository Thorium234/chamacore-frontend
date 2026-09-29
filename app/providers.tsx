"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { SessionProvider } from "@/features/auth/session";
import { ChamaProvider } from "@/features/chamas/ChamaContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <ChamaProvider>{children}</ChamaProvider>
      </SessionProvider>
    </NextThemesProvider>
  );
}