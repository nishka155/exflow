"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SettingsNav } from "@/components/modules/settings-nav";
import { useAuthStore } from "@/lib/store/auth-store";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = useAuthStore((s) => s.user?.role) === "ADMIN";

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and workspace." />
      <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
        <SettingsNav isAdmin={isAdmin} />
        <div>{children}</div>
      </div>
    </div>
  );
}
