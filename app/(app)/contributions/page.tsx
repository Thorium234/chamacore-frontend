"use client";

import { Suspense } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { TableSkeleton } from "@/components/ui/States";
import { RecordContributionForm } from "@/features/contributions/RecordContributionForm";
import { ContributionExplorer } from "@/features/contributions/ContributionExplorer";

export default function ContributionsPage() {
  const { activeChamaId } = useChama();
  const { capabilities } = useMemberRoles(activeChamaId);

  return (
    <div>
      <PageHeader
        title="Contributions"
        description={capabilities.isLeadership
          ? "Contribution records for this Chama. Confirmed contributions update the ledger and member shares."
          : "Your contribution history and settlement status."}
      />

      {capabilities.canRecordContributions ? (
        <Card title="Record a contribution" className="mb-6">
          <RecordContributionForm />
        </Card>
      ) : (
        <Alert tone="info" className="mb-6">
          You can review your own contribution history. Recording and reviewing group contributions is restricted to Chama executives.
        </Alert>
      )}

      <Suspense fallback={<TableSkeleton rows={6} cols={5} />}>
        <ContributionExplorer />
      </Suspense>
    </div>
  );
}
