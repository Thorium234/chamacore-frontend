import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { ChangePasswordForm } from "@/features/auth/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Change password" description="Keep your account secure." />
      <Card title="Choose a new password">
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
