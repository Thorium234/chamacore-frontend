"use client";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { ConnectionForm } from "@/features/payments/ConnectionForm";
import { ConnectionsList } from "@/features/payments/ConnectionsList";
import { PaymentForm } from "@/features/payments/PaymentForm";
import { IntentsList } from "@/features/payments/IntentsList";

export default function PaymentsPage() {
  const { activeChamaId } = useChama();
  const { isChair } = useMemberRoles(activeChamaId);

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Pay your contribution by M-Pesa, or manage this Chama's payment providers."
      />

      <Card title="Request a payment" className="mb-6">
        <PaymentForm />
      </Card>

      <Card title="Payment intents" className="mb-6">
        <IntentsList />
      </Card>

      {isChair ? (
        <>
          <Card title="Add a payment provider" className="mb-6">
            <ConnectionForm />
          </Card>
          <Card
            title="Payment connections"
            description="Credentials are stored encrypted and never shown again."
          >
            <ConnectionsList />
          </Card>
        </>
      ) : (
        <Alert tone="info" className="mb-6">
          Only the chairperson can manage payment providers. You can still request payments.
        </Alert>
      )}
    </div>
  );
}