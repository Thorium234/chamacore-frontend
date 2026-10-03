"use client";

import { useChama } from "@/features/chamas/ChamaContext";
import { StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { useQuery } from "@/lib/query/hooks";
import { getPlatformStats } from "@/lib/api/platform";
import { usePlatformAdmin } from "@/features/platform/usePlatformAdmin";
import { MyContributionStatusCard } from "@/features/dashboard/MyContributionStatus";

export default function DashboardPage() {
  const { activeChama } = useChama();
  const { isAdmin, isChecking } = usePlatformAdmin();
  const platformStats = useQuery(
    isAdmin ? "platform:stats" : null,
    getPlatformStats
  );

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Platform overview" : activeChama?.name ?? "My dashboard"}
        description={isAdmin
          ? "Overview of ChamaCore groups and accounts across the platform."
          : "Your contribution and share activity in this Chama."}
      />

      {isChecking ? <TableSkeleton rows={3} cols={2} /> : isAdmin ? (
        platformStats.isLoading ? <TableSkeleton rows={3} cols={2} /> : platformStats.error ? (
          <ErrorState message={platformStats.error.message} onRetry={platformStats.refetch} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Chamas" value={String(platformStats.data?.total_chamas ?? 0)} />
            <StatCard label="Active Chamas" value={String(platformStats.data?.active_chamas ?? 0)} />
            <StatCard label="Members" value={String(platformStats.data?.total_members ?? 0)} />
            <StatCard label="User accounts" value={String(platformStats.data?.total_users ?? 0)} />
          </div>
        )
      ) : (
        <MyContributionStatusCard />
      )}
    </div>
  );
}
