"use client";

import { useChama } from "@/features/chamas/ChamaContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { ApplyLoanForm } from "@/features/loans/ApplyLoanForm";
import { LoansList } from "@/features/loans/LoansList";

export default function LoansPage() {
  const { activeChamaId } = useChama();

  return (
    <div>
      <PageHeader
        title="Loans"
        description="Apply for a loan, review applications, disburse approved loans, and record repayments."
      />

      {activeChamaId ? (
        <>
          <Card title="Apply for a loan" className="mb-6">
            <ApplyLoanForm />
          </Card>
          <Card title="Loans" description="You must have been an active member for at least a month to qualify.">
            <LoansList />
          </Card>
        </>
      ) : (
        <Card title="Loans">Select a Chama to see its loans.</Card>
      )}
    </div>
  );
}