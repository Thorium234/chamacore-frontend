"use client";

import { useChama } from "@/features/chamas/ChamaContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { RequestPayoutForm } from "@/features/payouts/RequestPayoutForm";
import { PayoutsList } from "@/features/payouts/PayoutsList";

export default function PayoutsPage() {
  const { activeChamaId } = useChama();

  return (
    <div>
      <PageHeader
        title="Payouts"
        description="Request to withdraw part of your shares, and manage the Chama's payout pipeline."
      />

      {activeChamaId ? (
        <>
          <Card title="Request a payout" className="mb-6">
            <RequestPayoutForm />
          </Card>
          <Card title="Payouts" description="Requests move through approval, processing, and completion.">
            <PayoutsList />
          </Card>
        </>
      ) : (
        <Card title="Payouts">Select a Chama to see its payout requests.</Card>
      )}
    </div>
  );
}