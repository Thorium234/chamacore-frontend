"use client";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { RecordContributionForm } from "@/features/contributions/RecordContributionForm";
import { ContributionList } from "@/features/contributions/ContributionList";

export default function ContributionsPage() {
  const { activeChamaId } = useChama();
  const { canRecordContributions, isChair } = useMemberRoles(activeChamaId);

  const canManage = canRecordContributions || isChair;

  return (
    <div>
      <PageHeader
        title="Contributions"
        description="Contribution records per period. Confirmed contributions update the ledger and member shares."
      />

      {canManage ? (
        <Card title="Record a contribution" className="mb-6">
          <RecordContributionForm />
        </Card>
      ) : (
        <Alert tone="info" className="mb-6">
          Only leadership can record contributions. Your view is read-only.
        </Alert>
      )}

      <Card title="All contributions">
        <ContributionList />
      </Card>
    </div>
  );
}