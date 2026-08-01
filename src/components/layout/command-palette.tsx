"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/constants/nav";
import { type Role, roleCanAccess } from "@/lib/constants/roles";
import { QUICK_ACTIONS } from "@/lib/constants/quick-actions";

interface PaletteEntry {
  title: string;
  href: string;
  icon: LucideIcon;
  group: string;
}

export function CommandPalette({ role }: { role: Role }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const openViaEvent = () => setOpen(true);
    document.addEventListener("keydown", handler);
    document.addEventListener("exflow:open-command-palette", openViaEvent);
    return () => {
      document.removeEventListener("keydown", handler);
      document.removeEventListener("exflow:open-command-palette", openViaEvent);
    };
  }, []);

  const handleOpenChange = React.useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActiveIndex(0);
    }
  }, []);

  const allEntries = React.useMemo<PaletteEntry[]>(() => {
    const quickActions = QUICK_ACTIONS.filter((a) => roleCanAccess(role, a.moduleKey)).map(
      (a) => ({ ...a, group: "Quick actions" })
    );
    const navEntries = NAV_SECTIONS.flatMap((section) =>
      section.items
        .filter((item) => roleCanAccess(role, item.moduleKey))
        .map((item) => ({ title: item.title, href: item.href, icon: item.icon, group: section.title }))
    );
    return [...quickActions, ...navEntries];
  }, [role]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter((entry) => entry.title.toLowerCase().includes(q));
  }, [allEntries, query]);

  const grouped = React.useMemo(() => {
    const groups = new Map<string, PaletteEntry[]>();
    for (const entry of filtered) {
      const list = groups.get(entry.group) ?? [];
      list.push(entry);
      groups.set(entry.group, list);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = filtered[activeIndex];
      if (entry) go(entry.href);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-1/3 max-w-lg translate-y-0 gap-0 overflow-hidden rounded-xl p-0"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Search or jump to a module</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search invoices, containers, trucks, customers…"
            className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </p>
          )}
          {grouped.map(([groupName, entries]) => (
            <div key={groupName} className="mb-1">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {groupName}
              </p>
              {entries.map((entry) => {
                const globalIndex = filtered.indexOf(entry);
                const isActive = globalIndex === activeIndex;
                return (
                  <button
                    key={entry.href}
                    type="button"
                    onMouseEnter={() => setActiveIndex(globalIndex)}
                    onClick={() => go(entry.href)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
                      isActive ? "bg-muted text-foreground" : "text-foreground/90"
                    )}
                  >
                    <entry.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span>{entry.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
