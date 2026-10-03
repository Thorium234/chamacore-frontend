"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Table, Td } from "@/components/ui/Table";
import { PageControls } from "@/components/ui/PageControls";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { RequirePlatformAdmin } from "@/features/platform/RequirePlatformAdmin";
import {
  getPlatformStats,
  listPlatformChamas,
  listPlatformUsers,
  requirePasswordChange,
  revokePlatformAdmin,
  grantPlatformAdmin,
  setPlatformChamaStatus,
} from "@/lib/api/platform";
import { invalidate } from "@/lib/query/cache";
import { useMutation, useQuery } from "@/lib/query/hooks";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDate, formatMoney } from "@/lib/format";
import {
  PLATFORM_STATUS_TRANSITIONS,
  type ChamaStatus,
  type PlatformChamaOut,
} from "@/types/api";

/**
 * Platform-admin console (F3).
 *
 * Access is decided by `isPlatformAdmin()`'s probe, not by a role on the user
 * object — the backend exposes no such field. This screen is only ever rendered
 * when that probe returned true, so the 403 handling here is defence in depth.
 *
 * Status changes use `PATCH /platform/chamas/{id}/status` with `{ status,
 * reason }`, and only legal transitions are offered, matching
 * `app/services/platform.py:26`.
 */
function PlatformConsole() {
  const PAGE_SIZE = 50;
  const [chamaSearch, setChamaSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChamaStatus | "">("");
  const [userSearch, setUserSearch] = useState("");
  const [chamaOffset, setChamaOffset] = useState(0);
  const [userOffset, setUserOffset] = useState(0);
  const [statusTarget, setStatusTarget] = useState<PlatformChamaOut | null>(null);
  const [nextStatus, setNextStatus] = useState<ChamaStatus | "">("");
  const [reason, setReason] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);

  const stats = useQuery("platform:stats", getPlatformStats);

  const chamaKey = `platform:chamas:${chamaSearch.trim()}:${statusFilter}:${chamaOffset}`;
  const userKey = `platform:users:${userSearch.trim()}:${userOffset}`;
  const chamas = useQuery(
    chamaKey,
    async () =>
      listPlatformChamas({
        search: chamaSearch || null,
        status: statusFilter || null,
        limit: PAGE_SIZE,
        offset: chamaOffset,
      }),
    { refetchInterval: 60_000 }
  );

  const users = useQuery(
    userKey,
    async () => listPlatformUsers({ search: userSearch || null, limit: PAGE_SIZE, offset: userOffset }),
    { refetchInterval: 60_000 }
  );

  const allowedTargets = useMemo(
    () =>
      statusTarget ? PLATFORM_STATUS_TRANSITIONS[statusTarget.status] : [],
    [statusTarget]
  );

  const statusMutation = useMutation(
    async (input: { chamaId: string; status: ChamaStatus; reason: string | null }) =>
      setPlatformChamaStatus(input.chamaId, {
        status: input.status,
        reason: input.reason || null,
      }),
    { invalidates: ["platform:chamas", "platform:stats"] }
  );

  const passwordMutation = useMutation(
    async (userId: string) => requirePasswordChange(userId, "Reset by platform admin"),
    { invalidates: ["platform:users"] }
  );

  const grantMutation = useMutation((userId: string) => grantPlatformAdmin(userId), {
    invalidates: ["platform:users", "platform:stats"],
  });

  const revokeMutation = useMutation((userId: string) => revokePlatformAdmin(userId), {
    invalidates: ["platform:users", "platform:stats"],
  });

  function openStatusDialog(chama: PlatformChamaOut) {
    setRowError(null);
    setStatusTarget(chama);
    setNextStatus(PLATFORM_STATUS_TRANSITIONS[chama.status][0] ?? "");
    setReason("");
  }

  async function submitStatusChange() {
    if (!statusTarget || !nextStatus) return;
    setRowError(null);
    const result = await statusMutation.mutate({
      chamaId: statusTarget.id,
      status: nextStatus,
      reason: reason.trim() || null,
    });
    if (result) setStatusTarget(null);
    else if (statusMutation.error) setRowError(statusMutation.error.message);
  }

  function refreshAll() {
    invalidate("platform:chamas");
    invalidate("platform:users");
    invalidate("platform:stats");
  }

  const statItems = stats.data;

  return (
    <div>
      <PageHeader
        title="Platform administration"
        description="Cross-Chama lifecycle and user management. Every action is recorded in the audit log."
      />

      {stats.error ? (
        <ErrorState message={stats.error.message} onRetry={stats.refetch} />
      ) : statItems ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Chamas" value={String(statItems.total_chamas)} />
          <StatCard label="Active" value={String(statItems.active_chamas)} />
          <StatCard
            label="Pending / Suspended"
            value={`${statItems.pending_chamas} / ${statItems.suspended_chamas}`}
          />
          <StatCard
            label="Users / Members"
            value={`${statItems.total_users} / ${statItems.total_members}`}
          />
        </div>
      ) : null}

      <div className="space-y-6">
        <Card
          title="Chamas"
          description="Search and change lifecycle status. Dissolved is terminal."
          actions={
            <Button size="sm" variant="secondary" onClick={refreshAll}>
              Refresh
            </Button>
          }
        >
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Search"
              value={chamaSearch}
              onChange={(event) => {
                setChamaSearch(event.target.value);
                setChamaOffset(0);
              }}
              placeholder="Name"
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as ChamaStatus | "");
                setChamaOffset(0);
              }}
            >
              <option value="">Any status</option>
              {(["PENDING", "ACTIVE", "SUSPENDED", "DISSOLVED"] as ChamaStatus[]).map(
                (status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                )
              )}
            </Select>
          </div>

          {rowError ? (
            <Alert className="mb-4" title="Could not change status">
              {rowError}
            </Alert>
          ) : null}

          {chamas.error ? (
            <ErrorState message={chamas.error.message} onRetry={chamas.refetch} />
          ) : chamas.isLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (chamas.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No Chamas match"
              description="Adjust the search or status filter."
            />
          ) : (
            <Table head={["Chama", "Status", "Members", "Fee", "Actions"]}>
              {(chamas.data ?? []).map((chama) => (
                <tr key={chama.id}>
                  <Td>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {chama.name}
                    </span>
                    <span className="block text-xs text-zinc-400">
                      {chama.id.slice(0, 8)}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={chama.status} />
                  </Td>
                  <Td>
                    {chama.active_member_count} / {chama.membership_count}
                  </Td>
                  <Td>{formatMoney(chama.registration_fee_amount)}</Td>
                  <Td>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openStatusDialog(chama)}
                    >
                      Change status
                    </Button>
                  </Td>
                </tr>
              ))}
            </Table>
          )}

          <PageControls offset={chamaOffset} pageSize={PAGE_SIZE} itemCount={chamas.data?.length ?? 0} noun="Chamas" onPrevious={() => setChamaOffset(Math.max(0, chamaOffset - PAGE_SIZE))} onNext={() => setChamaOffset(chamaOffset + PAGE_SIZE)} />

          {statusTarget ? (
            <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950">
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                Change status for {statusTarget.name}
              </p>
              <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
                Currently {statusTarget.status}. Legal next steps are listed below; the server
                rejects anything else with 400 INVALID_STATE.
              </p>
              {allowedTargets.length === 0 ? (
                <p className="mt-3 text-sm text-indigo-800 dark:text-indigo-200">
                  This Chama is dissolved, which is terminal. No further transitions are possible.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  <Select
                    label="New status"
                    value={nextStatus}
                    onChange={(event) =>
                      setNextStatus(event.target.value as ChamaStatus)
                    }
                  >
                    {allowedTargets.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Recorded with the transition"
                    hint="Optional, up to 500 characters."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      loading={statusMutation.isPending}
                      disabled={!nextStatus}
                      onClick={submitStatusChange}
                    >
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setStatusTarget(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </Card>

        <Card
          title="Users"
          description="Force a password reset or grant and revoke platform admin."
        >
          <div className="mb-4">
            <Input
              label="Search"
              value={userSearch}
              onChange={(event) => {
                setUserSearch(event.target.value);
                setUserOffset(0);
              }}
              placeholder="Email"
            />
          </div>

          {users.error ? (
            <ErrorState message={users.error.message} onRetry={users.refetch} />
          ) : users.isLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (users.data?.length ?? 0) === 0 ? (
            <EmptyState title="No users match" description="Adjust the search." />
          ) : (
            <Table head={["Email", "Active", "Password", "Platform roles", "Actions"]}>
              {(users.data ?? []).map((platformUser) => {
                const isAdmin = platformUser.platform_roles.includes(
                  "PLATFORM_ADMIN"
                );
                return (
                  <tr key={platformUser.id}>
                    <Td>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {platformUser.email}
                      </span>
                      <span className="block text-xs text-zinc-400">
                        joined {formatDate(platformUser.created_at)}
                      </span>
                    </Td>
                    <Td>
                      {platformUser.is_active ? "Yes" : "No"}
                    </Td>
                    <Td>
                      {platformUser.must_change_password ? (
                        <Badge tone="amber">Must reset</Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </Td>
                    <Td>
                      {platformUser.platform_roles.length === 0 ? (
                        <span className="text-xs text-zinc-400">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {platformUser.platform_roles.map((role) => (
                            <Badge key={role} tone="indigo">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        {!platformUser.must_change_password ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={passwordMutation.isPending}
                            onClick={() =>
                              passwordMutation.mutate(platformUser.id)
                            }
                          >
                            Force reset
                          </Button>
                        ) : null}
                        {isAdmin ? (
                          <Button
                            size="sm"
                            variant="danger"
                            loading={revokeMutation.isPending}
                            onClick={() => revokeMutation.mutate(platformUser.id)}
                          >
                            Revoke admin
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={grantMutation.isPending}
                            onClick={() => grantMutation.mutate(platformUser.id)}
                          >
                            Make admin
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          )}

          <PageControls offset={userOffset} pageSize={PAGE_SIZE} itemCount={users.data?.length ?? 0} noun="users" onPrevious={() => setUserOffset(Math.max(0, userOffset - PAGE_SIZE))} onNext={() => setUserOffset(userOffset + PAGE_SIZE)} />

          {passwordMutation.error ? (
            <Alert className="mt-4" title="Could not force a password reset">
              {getErrorMessage(passwordMutation.error)}
            </Alert>
          ) : null}
          {grantMutation.error ? (
            <Alert className="mt-4" title="Could not grant platform admin">
              {getErrorMessage(grantMutation.error)}
            </Alert>
          ) : null}
          {revokeMutation.error ? (
            <Alert className="mt-4" title="Could not revoke platform admin">
              {getErrorMessage(revokeMutation.error)}
            </Alert>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

export default function PlatformPage() {
  return (
    <RequirePlatformAdmin>
      <PlatformConsole />
    </RequirePlatformAdmin>
  );
}
