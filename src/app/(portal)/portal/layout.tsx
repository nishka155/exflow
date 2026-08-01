"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Ship, Loader2 } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { PortalNav } from "@/components/modules/portal-nav";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthStore } from "@/lib/store/auth-store";
import { api } from "@/lib/api/client";

interface PortalCustomer {
  id: string;
  name: string;
}

function PortalLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);

  React.useEffect(() => {
    if (role && role !== "CUSTOMER") router.replace("/dashboard");
  }, [role, router]);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["portal-me"],
    queryFn: () => api.get<PortalCustomer>("/api/portal/me"),
    enabled: role === "CUSTOMER",
  });

  function handleSignOut() {
    useAuthStore.getState().clearAuth();
    router.push("/login");
  }

  if (role !== "CUSTOMER" || isLoading || !customer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
        <NotificationBell />
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="size-4" />
        </Button>
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

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PortalLayoutContent>{children}</PortalLayoutContent>
    </AuthGuard>
  );
}
