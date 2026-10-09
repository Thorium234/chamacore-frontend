"use client";

import { useSession } from "@/features/auth/session";
import { useChama } from "@/features/chamas/ChamaContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/States";
import { MemberLinkForm } from "@/features/auth/MemberLinkForm";
import { ChangePasswordForm } from "@/features/auth/ChangePasswordForm";
import { CreateChamaForm } from "@/features/chamas/CreateChamaForm";
import { usePlatformAdmin } from "@/features/platform/usePlatformAdmin";
import { formatDate } from "@/lib/format";

export default function ProfilePage() {
  const { user } = useSession();
  const { isAdmin, isChecking } = usePlatformAdmin();
  const {
    myChamas,
    isLoadingMyChamas,
    myChamasError,
    refreshMyChamas,
    setActiveChama,
  } = useChama();

  if (!user) return null;

  return (
    <div>
      <PageHeader title="Profile" description="Your account details and linked member record." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Account">
          <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-zinc-500">Email</dt>
              <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.email}</dd>
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
              <dd className="text-sm text-zinc-700 dark:text-zinc-300">{formatDate(user.created_at)}</dd>
            </div>
          </dl>
        </Card>

        {user.member_id ? (
          <Card
            title="Your Chamas"
            description="Chamas you are an active member of."
          >
            {isLoadingMyChamas ? (
              <Spinner />
            ) : myChamasError ? (
              <Alert title="Could not load your Chamas">
                <p>{myChamasError.message}</p>
                <div className="mt-3">
                  <Button size="sm" variant="secondary" onClick={refreshMyChamas}>
                    Retry
                  </Button>
                </div>
              </Alert>
            ) : myChamas.length === 0 ? (
              <p className="text-sm text-zinc-500">
                You have not created or joined any Chama yet. Create one below.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {myChamas.map((chama) => (
                  <li key={chama.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{chama.name}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setActiveChama(chama.id)}
                    >
                      Open
                    </Button>
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

      <Card
        title="Password"
        description="Choose a strong password. Your current session stays signed in."
        className="mt-6"
      >
        <ChangePasswordForm />
      </Card>

      {!isAdmin && !isChecking ? (
        <Card title="Create a Chama" className="mt-6">
          <CreateChamaForm />
        </Card>
      ) : null}
    </div>
  );
}
