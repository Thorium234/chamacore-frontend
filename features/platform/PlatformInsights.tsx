"use client";

import { Card } from "@/components/ui/Card";
import type { PlatformStatsOut } from "@/types/api";

const STATUS_COLORS = {
  active: "bg-emerald-500",
  pending: "bg-amber-400",
  suspended: "bg-rose-500",
  dissolved: "bg-zinc-400",
};

export function PlatformInsights({ stats }: { stats: PlatformStatsOut }) {
  const statusItems = [
    { label: "Active", value: stats.active_chamas, color: STATUS_COLORS.active },
    { label: "Pending", value: stats.pending_chamas, color: STATUS_COLORS.pending },
    { label: "Suspended", value: stats.suspended_chamas, color: STATUS_COLORS.suspended },
    { label: "Dissolved", value: stats.dissolved_chamas, color: STATUS_COLORS.dissolved },
  ];
  const maxReach = Math.max(stats.total_members, stats.total_users, 1);
  const reachItems = [
    { label: "Member records", value: stats.total_members, color: "bg-indigo-500" },
    { label: "User accounts", value: stats.total_users, color: "bg-cyan-500" },
  ];

  return (
    <section aria-label="Platform analytics" className="mt-6 grid gap-4 lg:grid-cols-2">
      <Card title="Chama lifecycle" description="Current groups by activation status">
        <div
          role="img"
          aria-label={statusItems.map(({ label, value }) => `${label}: ${value}`).join(", ")}
          className="flex h-5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        >
          {statusItems.map(({ label, value, color }) => (
            <div
              key={label}
              className={color}
              style={{ width: `${stats.total_chamas ? (value / stats.total_chamas) * 100 : 0}%` }}
              title={`${label}: ${value}`}
            />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {statusItems.map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden="true" />
              <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
              <strong className="ml-auto text-zinc-900 dark:text-zinc-100">{value}</strong>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          {stats.total_chamas
            ? `${Math.round((stats.active_chamas / stats.total_chamas) * 100)}% of groups are active.`
            : "No Chamas have been created yet."}
        </p>
      </Card>

      <Card title="Platform reach" description="Member identities and login accounts">
        <div className="space-y-5">
          {reachItems.map(({ label, value, color }) => (
            <div key={label}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
                <strong className="text-zinc-900 dark:text-zinc-100">{value}</strong>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${(value / maxReach) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Member records and login accounts are counted independently.
        </p>
      </Card>
    </section>
  );
}
