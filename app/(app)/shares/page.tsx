"use client";

import { Suspense } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/States";
import SharesViewer from "@/features/shares/SharesViewer";

export default function SharesPage() {
  return (
    <div>
      <PageHeader
        title="Shares"
        description="Share units per member, created from confirmed contributions."
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