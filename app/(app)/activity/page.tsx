"use client";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
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
  const { capabilities, isLoading } = useMemberRoles(activeChamaId);
  const isLeadership = capabilities.isLeadership;

  return (
    <div>
      <PageHeader
        title={isLeadership ? "Group activity" : "My activity"}
        description={isLeadership
          ? "A read-only view of this Chama's financial activity."
          : "Your own contribution and share activity in this Chama."}
      />

      <Alert tone="info" className="mb-6">
        {isLeadership
          ? "This page shows group financial activity. Settling contributions, issuing shares, and managing members are done on their own pages."
          : "This page is limited to your own contribution and share records. Group balances and other members' ledger activity are available to Chama executives."}
      </Alert>

      <div className="space-y-6">
        {isLoading ? null : isLeadership ? (
          <Card title="Balances" description="Straight from the Chama ledger.">
            <GroupBalances />
          </Card>
        ) : null}

        <Card
          title={isLeadership ? "Group contributions" : "My contributions"}
          description={isLeadership
            ? "What every member has contributed, and its settlement status."
            : "Your recorded contributions and their settlement status."}
        >
          <GroupContributions />
        </Card>

        <Card
          title={isLeadership ? "Group shares" : "My shares"}
          description={isLeadership
            ? "Share units issued per member. Unit price is server configuration and is not exposed."
            : "Your share units created from confirmed contributions."}
        >
          <GroupShares />
        </Card>

        {isLoading ? null : isLeadership ? (
          <Card title="Recent transactions" description="Newest first.">
            {activeChamaId ? <LedgerHistory chamaId={activeChamaId} /> : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
