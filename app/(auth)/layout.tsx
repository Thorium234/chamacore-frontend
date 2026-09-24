"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/features/auth/session";
import { Spinner } from "@/components/ui/States";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-2xl font-semibold tracking-tight text-indigo-600">ChamaCore</p>
        <p className="mt-1 text-sm text-zinc-500">
          Contributions, shares, and ledger for your Chama.
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}