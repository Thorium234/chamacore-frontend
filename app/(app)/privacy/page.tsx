import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Privacy Policy"
        description="Data collection, processing, and retention standards under the Kenya Data Protection Act 2019."
      />

      <Alert tone="info" title="Draft Placeholder — Subject to Legal Counsel">
        This document reflects technical data flows and retention rules. Legal counsel will ratify the formal privacy declaration prior to commercial launch.
      </Alert>

      <Card title="1. Information We Collect">
        <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
          <li><strong>Identity Data:</strong> Full name, phone number, and national ID/passport number for member linking.</li>
          <li><strong>Financial Records:</strong> Double-entry ledger postings, contribution receipts, loan allocations, and payout distributions.</li>
          <li><strong>Technical Data:</strong> IP addresses, request correlation IDs, and device session metadata.</li>
        </ul>
      </Card>

      <Card title="2. Purpose & Legal Basis for Processing">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Data is processed to facilitate savings group administration, M-Pesa reconciliation, and anti-money laundering (AML) compliance as required by Kenyan law.
        </p>
      </Card>

      <Card title="3. Retention and Right to Erasure">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Users may request account deletion at any time from their Profile. In accordance with financial recordkeeping obligations, transaction histories and ledger records are retained in an immutable, append-only store for a minimum statutory period of seven (7) years.
        </p>
      </Card>
    </div>
  );
}
