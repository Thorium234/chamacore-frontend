"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { StatementDownload } from "@/features/statements/StatementDownload";

export default function StatementsPage() {
  return (
    <div>
      <PageHeader
        title="Statements"
        description="Official PDF statements generated on the server from confirmed records."
      />
      <StatementDownload />
    </div>
  );
}