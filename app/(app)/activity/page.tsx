"use client";

import { useChama } from "@/features/chamas/ChamaContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { GroupBalances } from "@/features/activity/GroupBalances";
import { GroupContributions } from "@/features/activity/GroupContributions";
import { GroupShares } from "@/features/activity/GroupShares";
import { LedgerHistory } from "@/features/ledger/LedgerHistory";

/**
 * Group activity — the transparency surface.
 *
 * Every figure here comes from the API and is read-only for every active
 * member, matching the backend's access rules. Management actions stay on the
 * role-gated pages.
 */
export default function ActivityPage() {
  const { activeChamaId } = useChama();

  return (
    <div>
      <PageHeader
        title="Group activity"
        description="A read-only view of this Chama's finances, visible to every active member."
      />

      <Alert tone="info" className="mb-6">
        This page only displays what the Chama has recorded. Settling contributions, issuing
        shares, and managing members are done on their own pages by the people allowed to do them.
      </Alert>

      <div className="space-y-6">
        <Card title="Balances" description="Straight from the Chama ledger.">
          <GroupBalances />
        </Card>

        <Card
          title="Group contributions"
          description="What every member has contributed, and its settlement status."
        >
          <GroupContributions />
        </Card>

        <Card
          title="Group shares"
          description="Share units issued per member. Unit price is server configuration and is not exposed."
        >
          <GroupShares />
        </Card>

        <Card title="Recent transactions" description="Newest first.">
          {activeChamaId ? <LedgerHistory chamaId={activeChamaId} /> : null}
        </Card>
      </div>
    </div>
  );
}
