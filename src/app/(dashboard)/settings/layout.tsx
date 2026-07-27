import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsNav } from "@/components/modules/settings-nav";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and workspace." />
      <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
        <SettingsNav isAdmin={user.role === "ADMIN"} />
        <div>{children}</div>
      </div>
    </div>
  );
}
