"use client";

import { Button } from "@/components/ui/Button";

export function PageControls({
  offset,
  pageSize,
  itemCount,
  noun,
  onPrevious,
  onNext,
}: {
  offset: number;
  pageSize: number;
  itemCount: number;
  noun: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (offset === 0 && itemCount < pageSize) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {itemCount > 0
          ? `Showing ${noun} ${offset + 1}–${offset + itemCount}.`
          : `No ${noun} on this page.`}
      </p>
      <div className="flex gap-2">
        {offset > 0 ? (
          <Button size="sm" variant="secondary" onClick={onPrevious}>
            Newer
          </Button>
        ) : null}
        {itemCount >= pageSize ? (
          <Button size="sm" variant="secondary" onClick={onNext}>
            Load older
          </Button>
        ) : null}
      </div>
    </div>
  );
}
