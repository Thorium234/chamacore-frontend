import type { ReactNode } from "react";

import { cx } from "@/components/ui/cx";

type Tone = "gray" | "green" | "amber" | "red" | "blue" | "indigo";

const toneClasses: Record<Tone, string> = {
  gray: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  blue: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
};

export function Badge({
  tone = "gray",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  ACTIVE: "green",
  CONFIRMED: "green",
  SUCCEEDED: "green",
  COMPLETED: "green",
  DISBURSED: "green",
  REPAID: "green",
  PENDING: "amber",
  PENDING_VALIDATION: "amber",
  PROCESSING: "blue",
  INITIATED: "blue",
  SUBMITTED: "blue",
  APPROVED: "indigo",
  INVALID: "red",
  FAILED: "red",
  REVERSED: "red",
  REJECTED: "red",
  CANCELED: "red",
  CANCELLED: "red",
  INACTIVE: "gray",
  DISABLED: "gray",
  UNKNOWN: "gray",
  TIMEOUT: "amber",
  DRAFT: "gray",
  PARTIALLY_REPAID: "amber",
  REQUESTED: "amber",
  WAIVED: "gray",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "gray"}>{status}</Badge>;
}