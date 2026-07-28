"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell, type NotificationItem } from "@/components/layout/notification-bell";
import { AutoBreadcrumb } from "@/components/layout/auto-breadcrumb";

export function Topbar({
  onOpenSearch,
  notifications,
}: {
  onOpenSearch?: () => void;
  notifications: NotificationItem[];
}) {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="min-w-0 flex-1">
        <AutoBreadcrumb />
      </div>
      <button
        type="button"
        onClick={() => {
          onOpenSearch?.();
          document.dispatchEvent(new Event("exflow:open-command-palette"));
        }}
        className="hidden items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted sm:flex"
      >
        <Search className="size-3.5" />
        <span>Search…</span>
        <kbd className="ml-4 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>
      <NotificationBell notifications={notifications} />
      <ThemeToggle />
    </header>
  );
}
