"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useChama } from "@/features/chamas/ChamaContext";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { Table, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { useQuery } from "@/lib/query/hooks";
import { listShares } from "@/lib/api/shares";
import { listMemberships } from "@/lib/api/memberships";
import { formatDateTime } from "@/lib/format";
import type { MembershipOut } from "@/types/api";

function SharesViewer() {
  const { activeChamaId } = useChama();
  const chamaId = activeChamaId;
  const searchParams = useSearchParams();
  const preselected = searchParams.get("membership");

  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );
  const [selectedId, setSelectedId] = useState<string>("");

  const selected =
    memberships.data?.find((m) => m.id === selectedId) ??
    memberships.data?.find((m) => m.id === preselected) ??
    null;

  const shares = useQuery(
    chamaId && selected ? `${chamaId}:shares:${selected.id}` : null,
    async () => (chamaId && selected ? listShares(chamaId, selected.id) : [])
  );

  const memberLabel = (membership: MembershipOut) =>
    membership.member
      ? `${membership.member.last_name} ${membership.member.first_name} (#${membership.membership_number})`
      : `Member #${membership.membership_number}`;

  const effectiveId = selected?.id ?? "";
  const selectionValue = useMemo(
    () => (memberships.data?.some((m) => m.id === effectiveId) ? effectiveId : ""),
    [effectiveId, memberships.data]
  );

  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <Select
          label="Member"
          value={selectionValue}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          <option value="" disabled>
            Select a member to view shares…
          </option>
          {(memberships.data ?? []).map((membership) => (
            <option key={membership.id} value={membership.id}>
              {memberLabel(membership)}
            </option>
          ))}
        </Select>
      </div>

      {selected ? (
        <Card
          title={
            selected.member
              ? `${selected.member.last_name} ${selected.member.first_name}`
              : "Member"
          }
          description={`Membership #${selected.membership_number} · Share records created by confirmed contributions.`}
        >
          {shares.isLoading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : shares.error ? (
            <ErrorState message={shares.error.message} onRetry={shares.refetch} />
          ) : (shares.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No share records yet"
              description="Share units are created when contributions for this member are confirmed."
            />
          ) : (
            <Table head={["Created", "Units", "Status", "Contribution"]}>
              {(shares.data ?? []).map((share) => (
                <tr key={share.id}>
                  <Td>{formatDateTime(share.created_at)}</Td>
                  <Td>
                    <span className="font-mono text-sm text-zinc-900">{share.units}</span>
                  </Td>
                  <Td>
                    <StatusBadge status={share.status} />
                  </Td>
                  <Td>
                    <span className="text-xs text-zinc-400">{share.contribution_id.slice(0, 8)}…</span>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="Select a member"
            description="Choose a member above to see their share records."
          />
        </Card>
      )}
    </div>
  );
}

export default SharesViewer;