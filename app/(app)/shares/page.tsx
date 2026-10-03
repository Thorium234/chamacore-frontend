"use client";

import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/States";
import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import SharesViewer from "@/features/shares/SharesViewer";

export default function SharesPage() {
  const { activeChamaId } = useChama();
  const { capabilities } = useMemberRoles(activeChamaId);

  return (
    <div>
      <PageHeader
        title="Shares"
        description={capabilities.isLeadership
          ? "Share units issued per member from confirmed contributions."
          : "Your share units created from confirmed contributions."}
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-10 max-w-md" />
            <Skeleton className="h-48" />
          </div>
        }
      >
        <SharesViewer />
      </Suspense>
    </div>
  );
}
