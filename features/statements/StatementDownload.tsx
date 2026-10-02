"use client";

import { useState } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { listMemberships } from "@/lib/api/memberships";
import { downloadStatement, saveStatementFile } from "@/lib/api/statements";
import { useQuery } from "@/lib/query/hooks";
import { getErrorMessage, toApiError } from "@/lib/api/errors";
import type { MembershipOut } from "@/types/api";

/** Today in `YYYY-MM-DD`, the format the API expects for `from`/`to`. */
function isoToday(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Statement download (F7).
 *
 * The PDF is rendered server-side; this only picks the scope and window and
 * hands the blob to the browser. The member picker is shown **only** to
 * chair/treasurer because `statement.py:208` rejects any other member id with a
 * 403 — offering it to plain members would manufacture guaranteed failures.
 */
export function StatementDownload() {
  const { activeChamaId } = useChama();
  const { capabilities } = useMemberRoles(activeChamaId);
  const canPickMember =
    capabilities.isChair || capabilities.isTreasurer;

  const chamaId = activeChamaId;
  const [dateFrom, setDateFrom] = useState(() => `${isoToday().slice(0, 7)}-01`);
  const [dateTo, setDateTo] = useState(isoToday);
  const [membershipId, setMembershipId] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const memberships = useQuery<MembershipOut[]>(
    canPickMember && chamaId ? `${chamaId}:memberships` : null,
    async () => (chamaId ? listMemberships(chamaId) : [])
  );

  async function handleDownload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setSuccess(null);

    if (dateFrom && dateTo && dateTo < dateFrom) {
      setError("The end date must not be before the start date.");
      return;
    }

    setIsPending(true);
    try {
      const file = await downloadStatement(chamaId as string, {
        from: dateFrom || undefined,
        to: dateTo || undefined,
        membership_id: membershipId || null,
      });
      saveStatementFile(file);
      setSuccess(`Downloaded ${file.filename}`);
    } catch (err) {
      setError(getErrorMessage(toApiError(err)));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card
      title="Download a statement"
      description="A PDF built on the server from confirmed contributions, share units, and ledger lines."
    >
      <form onSubmit={handleDownload} noValidate className="space-y-4">
        {error ? (
          <Alert title="Could not build the statement">{error}</Alert>
        ) : null}
        {success ? <Alert tone="success">{success}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            hint="Leave empty to include everything."
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            hint="Inclusive end date."
          />
        </div>

        {canPickMember ? (
          <Select
            label="Scope"
            value={membershipId}
            onChange={(event) => setMembershipId(event.target.value)}
            hint="Leave on “Whole Chama” for the group-wide statement."
          >
            <option value="">Whole Chama</option>
            {(memberships.data ?? [])
              .filter((membership) => membership.status === "ACTIVE")
              .map((membership) => (
                <option key={membership.id} value={membership.id}>
                  {membership.member
                    ? `${membership.member.first_name} ${membership.member.last_name} (#${membership.membership_number})`
                    : `Member #${membership.membership_number}`}
                </option>
              ))}
          </Select>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Your statement covers your own share capital and registration fees.
          </p>
        )}

        <Button type="submit" loading={isPending} disabled={!chamaId}>
          Download PDF
        </Button>
      </form>
    </Card>
  );
}