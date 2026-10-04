"use client";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { useQuery } from "@/lib/query/hooks";
import { getCollectionAnalytics } from "@/lib/api/analytics";
import { formatMoney } from "@/lib/format";
import type { CollectionAnalyticsMonthOut } from "@/types/api";

const WIDTH = 640;
const BASELINE = 125;
const MAX_BAR_HEIGHT = 88;

function numeric(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-KE", {
    month: "short",
    timeZone: "UTC",
  });
}

function CollectionsChart({ months }: { months: CollectionAnalyticsMonthOut[] }) {
  const values = months.flatMap((item) => [
    numeric(item.contributions),
    numeric(item.registration_fees),
  ]);
  const scaleMax = Math.max(...values.map(Math.abs), 1);
  const scale = MAX_BAR_HEIGHT / scaleMax;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} 232`}
      role="img"
      aria-label="Monthly net contributions and registration fee collections over the last twelve months"
      className="mt-4 h-56 w-full overflow-visible"
    >
      {[37, 81, BASELINE, 169, 213].map((y) => (
        <line key={y} x1="24" x2="624" y1={y} y2={y} className="stroke-zinc-200 dark:stroke-zinc-700" strokeDasharray={y === BASELINE ? undefined : "3 5"} />
      ))}
      {months.map((item, index) => {
        const groupX = 34 + index * 50;
        const contribution = numeric(item.contributions);
        const fees = numeric(item.registration_fees);
        const contributionHeight = Math.max(Math.abs(contribution * scale), contribution ? 1 : 0);
        const feeHeight = Math.max(Math.abs(fees * scale), fees ? 1 : 0);
        const barY = (value: number, height: number) => (value >= 0 ? BASELINE - height : BASELINE);
        return (
          <g key={item.month}>
            <rect
              x={groupX}
              y={barY(contribution, contributionHeight)}
              width="13"
              height={contributionHeight}
              rx="2"
              className="fill-indigo-500"
            >
              <title>{`${item.month} contributions: ${formatMoney(item.contributions)}`}</title>
            </rect>
            <rect
              x={groupX + 15}
              y={barY(fees, feeHeight)}
              width="13"
              height={feeHeight}
              rx="2"
              className="fill-emerald-500"
            >
              <title>{`${item.month} registration fees: ${formatMoney(item.registration_fees)}`}</title>
            </rect>
            <text
              x={groupX + 13}
              y="226"
              textAnchor="middle"
              className="fill-zinc-500 text-[10px]"
            >
              {monthLabel(item.month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function CollectionAnalyticsCard({ chamaId }: { chamaId: string }) {
  const query = useQuery(
    `${chamaId}:collection-analytics`,
    () => getCollectionAnalytics(chamaId)
  );

  if (query.isLoading) {
    return <div className="mt-6 h-72 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />;
  }
  if (query.error) {
    return (
      <Alert tone="error" title="Could not load collection analytics">
        {query.error.message}
      </Alert>
    );
  }
  if (!query.data) return null;

  const latest = query.data.months.at(-1);
  return (
    <Card
      title="Collections"
      description={
        query.data.scope === "group"
          ? "Net contributions and registration fees for this Chama, by month."
          : "Your net contributions and registration fees, by month."
      }
      className="mt-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Current month net collected</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(latest?.total_collected ?? 0)}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-600 dark:text-zinc-300">
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />Contributions</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Registration fees</span>
        </div>
      </div>
      <CollectionsChart months={query.data.months} />
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Reversals reduce the month in which the reversal was posted. Figures come from posted ledger entries.
      </p>
    </Card>
  );
}
