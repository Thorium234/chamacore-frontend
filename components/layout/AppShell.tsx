"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { NavLinkList } from "@/components/layout/AppNav";
import { ChamaSwitcher } from "@/components/layout/ChamaSwitcher";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/States";
import { useSession } from "@/features/auth/session";
import { useChama } from "@/features/chamas/ChamaContext";
import { CreateChamaForm } from "@/features/chamas/CreateChamaForm";
import { shortId } from "@/lib/format";

function Onboarding() {
  const { knownChamaIds, setActiveChama } = useChama();
  return (
    <div className="mx-auto mt-8 max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Welcome to ChamaCore</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create a Chama to start tracking contributions, shares, and your ledger.
        </p>
      </div>

      {knownChamaIds.length > 0 ? (
        <Card title="Your recent Chamas">
          <ul className="divide-y divide-zinc-100">
            {knownChamaIds.map((chamaId) => (
              <li key={chamaId} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-zinc-700">{shortId(chamaId)}</span>
                <Button size="sm" variant="secondary" onClick={() => setActiveChama(chamaId)}>
                  Open
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card title="Create a new Chama">
        <CreateChamaForm />
      </Card>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status, user, logout } = useSession();
  const { activeChamaId, activeChama, chamaError, clearActiveChama } = useChama();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Spinner />
      </main>
    );
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-indigo-600">ChamaCore</span>
            {activeChamaId ? <ChamaSwitcher /> : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-zinc-500 sm:inline">
              {user?.email}
            </span>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
        <div className="lg:hidden">
          <NavLinkList orientation="horizontal" />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-zinc-200 bg-white lg:block">
          <div className="sticky top-[57px]">
            <NavLinkList />
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {!activeChamaId ? (
            <Onboarding />
          ) : chamaError ? (
            <div className="mx-auto mt-8 max-w-xl">
              <Alert title="This Chama is no longer available">
                <p>
                  {chamaError.message} You may not have an active membership in it
                  anymore.
                </p>
                <div className="mt-3">
                  <Button size="sm" variant="secondary" onClick={clearActiveChama}>
                    Choose another Chama
                  </Button>
                </div>
              </Alert>
            </div>
          ) : activeChama ? (
            children
          ) : (
            <div className="flex items-center justify-center">
              <Spinner />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}