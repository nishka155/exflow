import { redirect } from "next/navigation";
import Link from "next/link";
import { Ship } from "lucide-react";

import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { PortalNav } from "@/components/modules/portal-nav";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCustomerForPortalUser } from "@/lib/queries/customer-portal";
import { signOutAction } from "@/lib/auth/actions";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "CUSTOMER") redirect("/dashboard");

  const customer = await getCustomerForPortalUser(user.id);
  if (!customer) notFound();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
        <Link href="/portal" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Ship className="size-3.5" />
          </div>
          <span className="font-semibold">ExFlow</span>
          <span className="text-sm text-muted-foreground">Customer Portal</span>
        </Link>
        <div className="flex-1" />
        <NotificationBell notifications={notifications} />
        <ThemeToggle />
        <form action={signOutAction}>
          <Button variant="ghost" size="icon" type="submit">
            <LogOut className="size-4" />
          </Button>
        </form>
      </header>
      <div className="border-b px-4 sm:px-6">
        <PortalNav />
      </div>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
      <footer className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
        {customer.name} · ExFlow Customer Portal
      </footer>
    </div>
  );
}
