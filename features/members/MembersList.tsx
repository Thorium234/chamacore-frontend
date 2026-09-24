"use client";

import { useState } from "react";

import { useChama } from "@/features/chamas/ChamaContext";
import { useMemberRoles } from "@/features/roles/useMemberRoles";
import { Table, Td } from "@/components/ui/Table";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { useMutation, useQuery } from "@/lib/query/hooks";
import { assignRole, listRoles, removeRole } from "@/lib/api/roles";
import { listMemberships, updateMembershipStatus } from "@/lib/api/memberships";
import { waiveRegistrationFee } from "@/lib/api/registration-fees";
import { formatDate, formatMoney } from "@/lib/format";
import { toApiError, getErrorMessage } from "@/lib/api/errors";
import type { MembershipOut } from "@/types/api";

const LEADERSHIP_ROLES = ["TREASURER", "SECRETARY"];

type ConfirmAction =
  | { type: "status"; membership: MembershipOut; next: "ACTIVE" | "INACTIVE" }
  | { type: "waive"; membership: MembershipOut }
  | { type: "remove-role"; membership: MembershipOut; role: "TREASURER" | "SECRETARY" }
  | null;

export function MembersList() {
  const { activeChamaId } = useChama();
  const { isChair, isLeadership } = useMemberRoles(activeChamaId);
  const chamaId = activeChamaId;

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [error, setError] = useState<string | null>(null);

  const memberships = useQuery<MembershipOut[]>(
    chamaId ? `${chamaId}:memberships` : null,
    async () => {
      if (!chamaId) return [];
      return listMemberships(chamaId);
    }
  );
  const availableRoles = useQuery(
    chamaId ? `${chamaId}:roles` : null,
    async () => {
      if (!chamaId) return [];
      return listRoles(chamaId);
    }
  );

  const invalidations = chamaId ? [`${chamaId}:memberships`] : [];

  const statusMutation = useMutation(
    async () => {
      if (!chamaId || !confirmAction || confirmAction.type !== "status") return;
      return updateMembershipStatus(chamaId, confirmAction.membership.id, {
        status: confirmAction.next,
      });
    },
    { invalidates: invalidations }
  );

  const waiveMutation = useMutation(
    async () => {
      if (!chamaId || !confirmAction || confirmAction.type !== "waive") return;
      return waiveRegistrationFee(chamaId, confirmAction.membership.id);
    },
    { invalidates: invalidations }
  );

  const removeRoleMutation = useMutation(
    async () => {
      if (!chamaId || !confirmAction || confirmAction.type !== "remove-role") return;
      return removeRole(chamaId, confirmAction.membership.id, confirmAction.role);
    },
    { invalidates: invalidations }
  );

  const assignRoleMutation = useMutation(
    async (args: { membershipId: string; role: "TREASURER" | "SECRETARY" }) => {
      if (!chamaId) return;
      return assignRole(chamaId, args.membershipId, { role: args.role });
    },
    { invalidates: invalidations }
  );

  async function confirm() {
    setError(null);
    if (!confirmAction) return;
    let result;
    if (confirmAction.type === "status") result = await statusMutation.mutate();
    else if (confirmAction.type === "waive") result = await waiveMutation.mutate();
    else if (confirmAction.type === "remove-role") result = await removeRoleMutation.mutate();
    if (result) setConfirmAction(null);
    else {
      const err = statusMutation.error ?? waiveMutation.error ?? removeRoleMutation.error;
      if (err) setError(getErrorMessage(toApiError(err)));
    }
  }

  const pending = statusMutation.isPending || waiveMutation.isPending || removeRoleMutation.isPending;

  const assignableLeadership = (availableRoles.data ?? [])
    .map((role) => role.name)
    .filter((name): name is "TREASURER" | "SECRETARY" =>
      LEADERSHIP_ROLES.includes(name)
    );

  return (
    <>
      {memberships.isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : memberships.error ? (
        <ErrorState message={memberships.error.message} onRetry={memberships.refetch} />
      ) : (memberships.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No members yet"
          description={
            isLeadership
              ? "Add the first member to get started."
              : "Members will appear here once leadership adds them."
          }
        />
      ) : (
        <Table
          head={[
            "Member",
            "Phone",
            "No.",
            "Status",
            "Roles",
            isChair ? "Registration fee" : "Joined",
            isChair ? "Actions" : "",
          ]}
        >
          {memberships.data?.map((membership) => {
            const fee = membership.registration_fee;
            return (
              <tr key={membership.id}>
                <Td>
                  <span className="font-medium text-zinc-900">
                    {membership.member
                      ? `${membership.member.first_name} ${membership.member.last_name}`
                      : "—"}
                  </span>
                </Td>
                <Td>{membership.member?.phone_number ?? "—"}</Td>
                <Td>#{membership.membership_number}</Td>
                <Td>
                  <StatusBadge status={membership.status} />
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {membership.roles.map((role) => (
                      <span key={role} className="inline-flex items-center gap-1">
                        <Badge tone={role === "CHAIRPERSON" ? "indigo" : "blue"}>{role}</Badge>
                        {isChair && LEADERSHIP_ROLES.includes(role) ? (
                          <button
                            type="button"
                            aria-label={`Remove ${role} role`}
                            onClick={() =>
                              setConfirmAction({
                                type: "remove-role",
                                membership,
                                role: role as "TREASURER" | "SECRETARY",
                              })
                            }
                            className="text-zinc-400 hover:text-red-600"
                          >
                            ×
                          </button>
                        ) : null}
                      </span>
                    ))}
                    {isChair && membership.roles.includes("CHAIRPERSON") ? null : isChair ? (
                      <select
                        aria-label={`Assign role to ${membership.member?.first_name ?? "member"}`}
                        className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs text-zinc-600 focus:border-indigo-500 focus:outline-none"
                        defaultValue=""
                        onChange={(event) => {
                          const role = event.target.value as "TREASURER" | "SECRETARY";
                          if (role) {
                            void assignRoleMutation.mutate({
                              membershipId: membership.id,
                              role,
                            });
                          }
                        }}
                      >
                        <option value="" disabled>
                          Assign role…
                        </option>
                        {assignableLeadership
                          .filter((role) => !membership.roles.includes(role))
                          .map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                      </select>
                    ) : null}
                  </div>
                </Td>
                {isChair ? (
                  <Td>
                    {fee ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-600">{formatMoney(fee.amount)}</span>
                        <StatusBadge status={fee.status} />
                        {fee.status === "OWED" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setConfirmAction({ type: "waive", membership })}
                          >
                            Waive
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      "—"
                    )}
                  </Td>
                ) : (
                  <Td>{formatDate(membership.joined_at)}</Td>
                )}
                <Td>
                  {isChair && membership.status === "ACTIVE" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setConfirmAction({
                          type: "status",
                          membership,
                          next: "INACTIVE",
                        })
                      }
                    >
                      Deactivate
                    </Button>
                  ) : isChair && membership.status === "INACTIVE" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setConfirmAction({ type: "status", membership, next: "ACTIVE" })
                      }
                    >
                      Activate
                    </Button>
                  ) : null}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        onClose={() => {
          if (!pending) setConfirmAction(null);
        }}
        title={
          confirmAction?.type === "status"
            ? confirmAction.next === "INACTIVE"
              ? "Deactivate this member?"
              : "Activate this member?"
            : confirmAction?.type === "waive"
              ? "Waive this registration fee?"
              : "Remove this role?"
        }
        description={
          confirmAction?.type === "status"
            ? confirmAction.next === "INACTIVE"
              ? "The member will no longer participate in this Chama until reactivated."
              : "The member will regain access to this Chama."
            : confirmAction?.type === "waive"
              ? `The fee of ${formatMoney(confirmAction.membership.registration_fee?.amount ?? "0")} will be marked as waived and can be changed later only by the chairperson.`
              : confirmAction
                ? `Remove the ${confirmAction.role} role from this member.`
                : ""
        }
        confirmLabel={
          confirmAction?.type === "status"
            ? confirmAction.next === "INACTIVE"
              ? "Deactivate"
              : "Activate"
            : confirmAction?.type === "waive"
              ? "Waive fee"
              : "Remove role"
        }
        tone={confirmAction?.type === "remove-role" ? "danger" : "primary"}
        isPending={pending}
        error={error}
        onConfirm={confirm}
      />
    </>
  );
}