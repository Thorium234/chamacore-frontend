"use client";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { AddMemberForm } from "@/features/members/AddMemberForm";
import { MembersList } from "@/features/members/MembersList";

export default function MembersPage() {
  const { activeChamaId } = useChama();
  const { isLeadership } = useMemberRoles(activeChamaId);

  return (
    <div>
      <PageHeader
        title="Members"
        description="Memberships, roles, and registration fees for this Chama."
      />

      {isLeadership ? (
        <Card title="Add a member" className="mb-6">
          <AddMemberForm />
        </Card>
      ) : (
        <Alert tone="info" className="mb-6">
          Only chairpersons, treasurers, and secretaries can add members. Your
          role here is read-only.
        </Alert>
      )}

      <Card title="Member list">
        <MembersList />
      </Card>
    </div>
  );
}