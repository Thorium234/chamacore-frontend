import type { ReactNode } from "react";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex items-center gap-2 py-8 text-sm text-zinc-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-200 ${className}`} />;
}

export function TableSkeleton({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center">
      <p className="text-base font-semibold text-zinc-700">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center">
      <p className="font-medium text-red-800">{title}</p>
      {message ? <p className="mt-1 text-sm text-red-700">{message}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}