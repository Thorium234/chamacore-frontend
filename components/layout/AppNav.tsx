"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui/cx";
import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { usePlatformAdmin } from "@/features/platform/usePlatformAdmin";
import type { ChamaCapabilities } from "@/features/roles/useMemberRoles";

export interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  /**
   * Capability required for this entry to appear. Omitted means every active
   * member sees it — which matches the backend, where any ACTIVE membership
   * can read every Chama page. Only management surfaces are gated here.
   */
  requires?: keyof ChamaCapabilities;
  /**
   * Global (platform-scoped) gate, used only for the admin console. Resolved by
   * probing `/platform/stats` because the backend exposes no such flag on the
   * user. Distinct from `requires`: this role is not a Chama membership role.
   */
  requiresPlatformAdmin?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Two sections rather than one flat list. Read-only financial views stay
 * visible to every member (the API allows it), while the roster and oversight
 * tools are grouped under "Manage" and shown to leadership.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", exact: true },
      { href: "/activity", label: "Activity" },
      { href: "/contributions", label: "Contributions" },
      { href: "/shares", label: "Shares" },
      { href: "/ledger", label: "Ledger", requires: "isLeadership" },
      { href: "/loans", label: "Loans" },
      { href: "/payouts", label: "Payouts" },
      { href: "/payments", label: "Payments" },
      { href: "/statements", label: "Statements" },
      { href: "/notifications", label: "Notifications" },
      { href: "/profile", label: "Profile" },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/members", label: "Members", requires: "isLeadership" },
      { href: "/audit", label: "Audit log", requires: "isLeadership" },
    ],
  },
  {
    title: "Platform",
    items: [
      {
        href: "/platform",
        label: "Administration",
        requiresPlatformAdmin: true,
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

function NavLink({
  item,
  orientation,
  onNavigate,
}: {
  item: NavItem;
  orientation: "vertical" | "horizontal";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cx(
        "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        orientation === "horizontal" && "shrink-0 whitespace-nowrap",
        isActive
          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      )}
    >
      {item.label}
    </Link>
  );
}

export function NavLinkList({
  orientation = "vertical",
  onNavigate,
}: {
  orientation?: "vertical" | "horizontal";
  onNavigate?: () => void;
}) {
  const { activeChamaId } = useChama();
  const { capabilities, isLoading } = useMemberRoles(activeChamaId);
  const { isAdmin: isPlatformAdmin, isChecking: isCheckingAdmin } = usePlatformAdmin();

  // While the memberships list loads we cannot know the caller's roles, so show
  // every entry rather than flashing a collapsed nav and then re-flowing the
  // layout. The backend still rejects anything the user may not do.
  //
  // The platform probe is treated the same way: showing the entry until the
  // probe resolves avoids a link that appears seconds after load. It is the one
  // gate where we briefly show something the user may not have — the route
  // itself refuses non-admins.
  const pending = isLoading || isCheckingAdmin;
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (pending) return true;
      if (item.requiresPlatformAdmin) return isPlatformAdmin;
      return !item.requires || capabilities[item.requires];
    }),
  })).filter((section) => section.items.length > 0);

  if (orientation === "horizontal") {
    return (
      <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 py-2">
        {sections.flatMap((section) => section.items).map((item) => (
          <NavLink key={item.href} item={item} orientation="horizontal" onNavigate={onNavigate} />
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Main" className="flex flex-col gap-4 p-3">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {section.title}
          </p>
          <div className="flex flex-col gap-1">
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} orientation="vertical" onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
