"use client";

import { useChama } from "@/features/chamas/ChamaContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { AuditLogTable } from "@/features/audit/AuditLogTable";

export default function AuditPage() {
  const { activeChamaId } = useChama();

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="A chronological record of actions taken in this Chama."
      />

      {activeChamaId ? (
        <Card title="Audit events" description="Every action is attributed to an actor and a request.">
          <AuditLogTable />
        </Card>
      ) : (
        <Card title="Audit log">Select a Chama to see its audit events.</Card>
      )}
    </div>
  );
}