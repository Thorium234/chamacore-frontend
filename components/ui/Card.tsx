import type { ReactNode } from "react";

import { cx } from "@/components/ui/cx";

export function Card({
  title,
  description,
  actions,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cx(
        "rounded-xl border border-zinc-200 bg-white shadow-sm",
        className
      )}
    >
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            {title ? (
              <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}