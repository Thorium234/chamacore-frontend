"use client";

import { useEffect, useState, type ReactNode } from "react";
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

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

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
  const [navOpen, setNavOpen] = useState(false);

  function toggleNav() {
    setNavOpen((open) => !open);
  }

  useEffect(() => {
    if (!navOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

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
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleNav}
              aria-expanded={navOpen}
              aria-controls="mobile-nav"
              aria-label={navOpen ? "Close navigation menu" : "Open navigation menu"}
              className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden"
            >
              {navOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
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
        {navOpen ? (
          <div id="mobile-nav" className="border-t border-zinc-200 lg:hidden">
            <NavLinkList onNavigate={() => setNavOpen(false)} />
          </div>
        ) : null}
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