"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui/cx";

export interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/members", label: "Members" },
  { href: "/contributions", label: "Contributions" },
  { href: "/shares", label: "Shares" },
  { href: "/ledger", label: "Ledger" },
  { href: "/loans", label: "Loans" },
  { href: "/payouts", label: "Payouts" },
  { href: "/payments", label: "Payments" },
  { href: "/audit", label: "Audit log" },
  { href: "/profile", label: "Profile" },
];

export function NavLinkList({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={
        orientation === "vertical"
          ? "flex flex-col gap-1 p-3"
          : "flex gap-1 overflow-x-auto px-3 py-2"
      }
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cx(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              orientation === "horizontal" && "shrink-0 whitespace-nowrap",
              isActive
                ? "bg-indigo-50 text-indigo-700"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}