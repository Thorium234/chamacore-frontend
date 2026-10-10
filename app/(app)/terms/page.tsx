import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

export default function TermsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Terms of Service"
        description="General terms and operating rules governing ChamaCore accounts."
      />

      <Alert tone="info" title="Draft Placeholder — Pending Legal Review">
        This document is an architectural placeholder for platform launch. Official terms will be published upon final review by licensed legal counsel.
      </Alert>

      <Card title="1. Group Ownership & Financial Responsibilities">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          ChamaCore provides savings group management, accounting ledgers, and payment reconciliation software. Chama funds are held in approved commercial accounts or M-Pesa merchant accounts governed by the designated group leadership.
        </p>
      </Card>

      <Card title="2. Account Security & Prohibited Activities">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Users are responsible for safeguarding login credentials. Impersonation, unauthorized ledger alteration, and bypassing multi-signature payout controls are strictly prohibited.
        </p>
      </Card>

      <Card title="3. Dispute Resolution & Kenyan Law">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          All group management disputes are subject to the laws of Kenya and the constitution agreed upon by each individual Chama group.
        </p>
      </Card>
    </div>
  );
}
