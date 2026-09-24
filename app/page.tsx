"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/features/auth/session";
import { Spinner } from "@/components/ui/States";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
    else if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  return (
    <main className="flex flex-1 items-center justify-center">
      <Spinner label="ChamaCore" />
    </main>
  );
}