"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/portal/bookings", label: "Bookings" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/invoices", label: "Invoices" },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      {ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm",
              isActive
                ? "border-brand font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
