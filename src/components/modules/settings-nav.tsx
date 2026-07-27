"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/settings/profile", label: "Profile" },
    ...(isAdmin ? [{ href: "/settings/users", label: "Users" }] : []),
  ];

  return (
    <nav className="flex gap-1 lg:flex-col">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm",
            pathname === item.href
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/60"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
