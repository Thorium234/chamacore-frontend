import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

export default function RefundsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment & Refund Policy"
        description="Guidelines on M-Pesa transaction disputes, double charges, and contribution reversals."
      />

      <Alert tone="info" title="Draft Placeholder — Pending Finance Policy Approval">
        This document outlines technical transaction handling and reconciliation mechanisms.
      </Alert>

      <Card title="1. M-Pesa Transactions & Deductions">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          STK Push requests and C2B Paybill deposits are processed via Safaricom Daraja. All payments are verified using unique provider transaction receipts (`TransID`) and registered against active membership accounts.
        </p>
      </Card>

      <Card title="2. Duplicate Charges">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          In the event of an inadvertent double deduction by Safaricom, the user must provide the duplicate M-Pesa transaction reference. Verified duplicate charges will be reconciled by Chama leadership through compensating reversals or dividend adjustments.
        </p>
      </Card>

      <Card title="3. Withdrawal & Payout Rules">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Member savings withdrawals, loans, and emergency fund disbursements are subject to the specific constitution, notice period, and quorum requirements of each Chama.
        </p>
      </Card>
    </div>
  );
}
