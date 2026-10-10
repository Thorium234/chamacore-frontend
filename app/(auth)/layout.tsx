"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useSession } from "@/features/auth/session";
import { Spinner } from "@/components/ui/States";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "authenticated") {
      const rawReturn = searchParams.get("returnUrl");
      const safeReturn =
        rawReturn && rawReturn.startsWith("/") && !rawReturn.startsWith("//")
          ? rawReturn
          : "/dashboard";
      router.replace(safeReturn);
    }
  }, [status, router, searchParams]);

  if (status === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Spinner />
      </main>
    );
  }

  return <>{children}</>;
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <Spinner />
        </main>
      }
    >
      <AuthGate>
        <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
          <div className="mb-6 text-center">
            <p className="text-2xl font-semibold tracking-tight text-indigo-600">ChamaCore</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Contributions, shares, and ledger for your Chama.
            </p>
          </div>
          <div className="w-full max-w-md">{children}</div>
        </main>
      </AuthGate>
    </Suspense>
  );
}