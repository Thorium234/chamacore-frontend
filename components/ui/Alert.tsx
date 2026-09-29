import type { ReactNode } from "react";

import { cx } from "@/components/ui/cx";

type Tone = "error" | "success" | "info";

const toneClasses: Record<Tone, string> = {
  error: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
};

const labelFor: Record<Tone, string> = {
  error: "There was a problem",
  success: "Success",
  info: "Notice",
};

export function Alert({
  tone = "error",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : tone === "success" ? "status" : undefined}
      className={cx(
        "rounded-lg border px-4 py-3 text-sm",
        toneClasses[tone],
        className
      )}
    >
      <p className="font-medium">{title ?? labelFor[tone]}</p>
      {children ? <div className="mt-1 text-sm opacity-90">{children}</div> : null}
    </div>
  );
}