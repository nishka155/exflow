import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "CUSTOMER") redirect("/portal");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <SidebarProvider>
      <AppSidebar role={user.role} userName={user.name} userEmail={user.email} />
      <SidebarInset>
        <Topbar notifications={notifications} />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
      <CommandPalette role={user.role} />
    </SidebarProvider>
  );
}
