"use client";

import { useSession } from "@/features/auth/session";
import { useChama } from "@/features/chamas/ChamaContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MemberLinkForm } from "@/features/auth/MemberLinkForm";
import { CreateChamaForm } from "@/features/chamas/CreateChamaForm";
import { formatDate } from "@/lib/format";

export default function ProfilePage() {
  const { user } = useSession();
  const { knownChamaIds, setActiveChama } = useChama();

  if (!user) return null;

  return (
    <div>
      <PageHeader title="Profile" description="Your account details and linked member record." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Account">
          <dl className="divide-y divide-zinc-100">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-zinc-500">Email</dt>
              <dd className="text-sm font-medium text-zinc-900">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-zinc-500">Member record</dt>
              <dd>
                {user.member_id ? (
                  <Badge tone="green">Linked</Badge>
                ) : (
                  <Badge tone="amber">Not linked</Badge>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-zinc-500">Joined</dt>
              <dd className="text-sm text-zinc-700">{formatDate(user.created_at)}</dd>
            </div>
          </dl>
        </Card>

        {user.member_id ? (
          <Card
            title="Your Chamas"
            description="Chamas you have opened recently on this device."
          >
            {knownChamaIds.length === 0 ? (
              <p className="text-sm text-zinc-500">
                You have not opened any Chama yet. Create one below.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {knownChamaIds.map((chamaId) => (
                  <li key={chamaId} className="flex items-center justify-between py-2.5">
                    <span className="font-mono text-xs text-zinc-600">{chamaId.slice(0, 8)}…</span>
                    <button
                      type="button"
                      onClick={() => setActiveChama(chamaId)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : (
          <Card title="Link your member record">
            <MemberLinkForm />
          </Card>
        )}
      </div>

      <Card title="Create a new Chama" className="mt-6">
        <CreateChamaForm />
      </Card>
    </div>
  );
}