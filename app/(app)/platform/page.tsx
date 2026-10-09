"use client";

import { useMemo, useState, type FormEvent } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Table, Td } from "@/components/ui/Table";
import { PageControls } from "@/components/ui/PageControls";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { RequirePlatformAdmin } from "@/features/platform/RequirePlatformAdmin";
import { useSession } from "@/features/auth/session";
import {
  getPlatformStats,
  listPlatformAdmins,
  listPlatformChamas,
  grantPlatformAdmin,
  revokePlatformAdmin,
  requirePlatformUserPasswordChange,
  searchPlatformUsers,
  setPlatformUserActive,
  setPlatformChamaStatus,
} from "@/lib/api/platform";
import { invalidate } from "@/lib/query/cache";
import { useMutation, useQuery } from "@/lib/query/hooks";
import { formatDate } from "@/lib/format";
import {
  PLATFORM_STATUS_TRANSITIONS,
  type ChamaStatus,
  type PlatformChamaOut,
  type PlatformUserOut,
} from "@/types/api";

function PlatformConsole() {
  const PAGE_SIZE = 50;
  const { user } = useSession();
  const [chamaSearch, setChamaSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChamaStatus | "">("");
  const [chamaOffset, setChamaOffset] = useState(0);
  const [statusTarget, setStatusTarget] = useState<PlatformChamaOut | null>(null);
  const [nextStatus, setNextStatus] = useState<ChamaStatus | "">("");
  const [reason, setReason] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userNotice, setUserNotice] = useState<string | null>(null);

  const stats = useQuery("platform:stats", getPlatformStats);
  const chamaKey = `platform:chamas:${chamaSearch.trim()}:${statusFilter}:${chamaOffset}`;
  const chamas = useQuery(
    chamaKey,
    async () => listPlatformChamas({
      search: chamaSearch || null,
      status: statusFilter || null,
      limit: PAGE_SIZE,
      offset: chamaOffset,
    }),
    { refetchInterval: 60_000 }
  );
  const admins = useQuery("platform:admins", listPlatformAdmins, { refetchInterval: 60_000 });
  const users = useQuery(
    userSearch.trim().length >= 2 ? `platform:users:${userSearch.trim()}` : null,
    () => searchPlatformUsers(userSearch.trim())
  );
  const allowedTargets = useMemo(
    () => statusTarget ? PLATFORM_STATUS_TRANSITIONS[statusTarget.status] : [],
    [statusTarget]
  );

  const statusMutation = useMutation(
    async (input: { chamaId: string; status: ChamaStatus; reason: string | null }) =>
      setPlatformChamaStatus(input.chamaId, { status: input.status, reason: input.reason }),
    { invalidates: ["platform:chamas", "platform:stats"] }
  );
  const grantMutation = useMutation(grantPlatformAdmin, {
    invalidates: ["platform:admins", "platform:stats"],
  });
  const revokeMutation = useMutation(revokePlatformAdmin, {
    invalidates: ["platform:admins", "platform:stats"],
  });
  const passwordMutation = useMutation(requirePlatformUserPasswordChange, {
    invalidates: ["platform:users"],
  });
  const activeMutation = useMutation(setPlatformUserActive, {
    invalidates: ["platform:users", "platform:admins"],
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
    const updated = await statusMutation.mutate({
      chamaId: statusTarget.id,
      status: nextStatus,
      reason: reason.trim() || null,
    });
    if (updated) setStatusTarget(null);
    else if (statusMutation.error) setRowError(statusMutation.error.message);
  }

  async function addPlatformAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminError(null);
    setAdminNotice(null);
    const created = await grantMutation.mutate(adminEmail.trim());
    if (created) {
      setAdminNotice(`${created.email} now has platform administrator access.`);
      setAdminEmail("");
    } else if (grantMutation.error) {
      setAdminError(grantMutation.error.message);
    }
  }

  async function removePlatformAdmin(admin: PlatformUserOut) {
    setAdminError(null);
    setAdminNotice(null);
    const removed = await revokeMutation.mutate(admin.id);
    if (removed) setAdminNotice(`Platform administrator access removed for ${removed.email}.`);
    else if (revokeMutation.error) setAdminError(revokeMutation.error.message);
  }

  function refreshAll() {
    invalidate("platform:chamas");
    invalidate("platform:admins");
    invalidate("platform:stats");
    invalidate("platform:users");
  }

  return (
    <div>
      <PageHeader
        title="Platform administration"
        description="Manage tenants, accounts, and platform access. Chama financial operations remain with Chama roles."
      />

      {stats.error ? (
        <ErrorState message={stats.error.message} onRetry={stats.refetch} />
      ) : stats.data ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-sm text-zinc-500">Total Chamas</p><p className="mt-1 text-2xl font-semibold">{stats.data.total_chamas}</p></div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-sm text-zinc-500">Active</p><p className="mt-1 text-2xl font-semibold">{stats.data.active_chamas}</p></div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-sm text-zinc-500">Awaiting activation</p><p className="mt-1 text-2xl font-semibold">{stats.data.pending_chamas}</p></div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-sm text-zinc-500">Suspended</p><p className="mt-1 text-2xl font-semibold">{stats.data.suspended_chamas}</p></div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-sm text-zinc-500">Accounts</p><p className="mt-1 text-2xl font-semibold">{stats.data.total_users}</p></div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-sm text-zinc-500">Members</p><p className="mt-1 text-2xl font-semibold">{stats.data.total_members}</p></div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-sm text-zinc-500">Platform admins</p><p className="mt-1 text-2xl font-semibold">{stats.data.platform_admins}</p></div>
        </div>
      ) : null}

      <div className="space-y-6">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><h2 className="font-semibold">Chama activation</h2><p className="mt-1 text-sm text-zinc-500">Review each owner’s request and change the lifecycle status.</p></div>
            <Button size="sm" variant="secondary" onClick={refreshAll}>Refresh</Button>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <Input label="Search Chama" value={chamaSearch} onChange={(event) => { setChamaSearch(event.target.value); setChamaOffset(0); }} placeholder="Chama name" />
            <Select label="Status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as ChamaStatus | ""); setChamaOffset(0); }}>
              <option value="">Any status</option>
              {(["PENDING", "ACTIVE", "SUSPENDED", "DISSOLVED"] as ChamaStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
            </Select>
          </div>
          {rowError ? <Alert className="mb-4" title="Could not change status">{rowError}</Alert> : null}
          {chamas.error ? <ErrorState message={chamas.error.message} onRetry={chamas.refetch} /> : chamas.isLoading ? <TableSkeleton rows={5} cols={4} /> : (chamas.data?.length ?? 0) === 0 ? <EmptyState title="No Chamas match" description="Adjust the search or status filter." /> : (
            <Table head={["Chama", "Owner", "Members", "Status", "Actions"]}>
              {(chamas.data ?? []).map((chama) => <tr key={chama.id}>
                <Td><span className="font-medium">{chama.name}</span><span className="block text-xs text-zinc-400">Created {formatDate(chama.created_at)}</span></Td>
                <Td><span className="font-medium">{chama.owner_name ?? "Account owner"}</span><span className="block text-xs text-zinc-500">{chama.owner_email}</span>{chama.owner_phone ? <span className="block text-xs text-zinc-500">{chama.owner_phone}</span> : null}</Td>
                <Td>{chama.active_member_count} active <span className="block text-xs text-zinc-500">{chama.membership_count} total</span></Td>
                <Td><StatusBadge status={chama.status} /></Td>
                <Td><Button size="sm" variant="secondary" onClick={() => openStatusDialog(chama)}>Change status</Button></Td>
              </tr>)}
            </Table>
          )}
          <PageControls offset={chamaOffset} pageSize={PAGE_SIZE} itemCount={chamas.data?.length ?? 0} noun="Chamas" onPrevious={() => setChamaOffset(Math.max(0, chamaOffset - PAGE_SIZE))} onNext={() => setChamaOffset(chamaOffset + PAGE_SIZE)} />
          {statusTarget ? <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950">
            <p className="text-sm font-medium">Change status for {statusTarget.name}</p>
            <p className="mt-1 text-xs">Current status: {statusTarget.status}.</p>
            {allowedTargets.length === 0 ? <p className="mt-3 text-sm">This Chama is dissolved and cannot be reactivated.</p> : <div className="mt-3 space-y-3">
              <Select label="New status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ChamaStatus)}>{allowedTargets.map((status) => <option key={status} value={status}>{status}</option>)}</Select>
              <Input label="Reason (optional)" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} />
              <div className="flex gap-2"><Button size="sm" loading={statusMutation.isPending} disabled={!nextStatus} onClick={submitStatusChange}>Apply</Button><Button size="sm" variant="secondary" onClick={() => setStatusTarget(null)}>Cancel</Button></div>
            </div>}
          </div> : null}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold">Account support</h2>
          <p className="mt-1 text-sm text-zinc-500">Find an account by email, phone number, or government ID. Government IDs are never shown in results.</p>
          <div className="mt-4 max-w-xl"><Input label="Find account" value={userSearch} onChange={(event) => { setUserSearch(event.target.value); setUserNotice(null); }} placeholder="Enter at least two characters" /></div>
          {userNotice ? <p className="mt-3 text-sm text-emerald-700" role="status">{userNotice}</p> : null}
          {userSearch.trim().length >= 2 ? (
            <div className="mt-4">
              {users.error ? <ErrorState message={users.error.message} onRetry={users.refetch} /> : users.isLoading ? <TableSkeleton rows={3} cols={4} /> : !users.data?.length ? <EmptyState title="No matching accounts" description="Try email, phone number, or government ID." /> : (
                <Table head={["Account", "Member identity", "Security", "Actions"]}>
                  {users.data.map((account) => <tr key={account.id}>
                    <Td><span className="font-medium">{account.email}</span><span className="block text-xs text-zinc-500">{account.is_active ? "Active" : "Login disabled"}</span></Td>
                    <Td>{account.member_name ?? "No member record"}{account.member_phone ? <span className="block text-xs text-zinc-500">{account.member_phone}</span> : null}</Td>
                    <Td>{account.must_change_password ? <Badge tone="amber">Password change required</Badge> : <Badge tone="green">Normal access</Badge>}</Td>
                    <Td><div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" loading={passwordMutation.isPending} onClick={async () => { const result = await passwordMutation.mutate(account.id); if (result) setUserNotice(`Password change required for ${result.email}.`); }}>Require password change</Button>
                      <Button size="sm" variant={account.is_active ? "danger" : "secondary"} loading={activeMutation.isPending} onClick={async () => { const result = await activeMutation.mutate(account.id, !account.is_active); if (result) setUserNotice(`${result.email} is now ${result.is_active ? "active" : "disabled"}.`); }}>{account.is_active ? "Disable login" : "Reactivate login"}</Button>
                    </div></Td>
                  </tr>)}
                </Table>
              )}
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold">Platform administrators</h2>
          <p className="mt-1 text-sm text-zinc-500">Add another platform operator by the email on their existing account. This does not assign a Chama role.</p>
          <form onSubmit={addPlatformAdmin} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1"><Input label="Account email" type="email" required value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="operator@example.com" /></div>
            <Button type="submit" loading={grantMutation.isPending}>Grant platform access</Button>
          </form>
          {adminNotice ? <p className="mt-3 text-sm text-emerald-700" role="status">{adminNotice}</p> : null}
          {adminError ? <Alert className="mt-3" title="Could not update platform admins">{adminError}</Alert> : null}
          <div className="mt-5">
            {admins.error ? <ErrorState message={admins.error.message} onRetry={admins.refetch} /> : admins.isLoading ? <TableSkeleton rows={2} cols={3} /> : !admins.data?.length ? <EmptyState title="No platform admins" description="An administrator will appear here once assigned." /> : (
              <Table head={["Administrator", "Status", "Access", ""]}>
                {admins.data.map((admin) => <tr key={admin.id}>
                  <Td><span className="font-medium">{admin.email}</span><span className="block text-xs text-zinc-400">Added {formatDate(admin.created_at)}</span></Td>
                  <Td>{admin.is_active ? <Badge tone="green">Active account</Badge> : <Badge tone="amber">Disabled account</Badge>}</Td>
                  <Td><Badge tone="indigo">PLATFORM_ADMIN</Badge></Td>
                  <Td>{admin.id !== user?.id ? <Button size="sm" variant="danger" loading={revokeMutation.isPending} onClick={() => removePlatformAdmin(admin)}>Remove</Button> : <span className="text-xs text-zinc-400">You</span>}</Td>
                </tr>)}
              </Table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function PlatformPage() {
  return <RequirePlatformAdmin><PlatformConsole /></RequirePlatformAdmin>;
}
