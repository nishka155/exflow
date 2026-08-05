import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Truck,
  Container,
  DoorOpen,
  Send,
  Anchor,
  Boxes,
  FolderOpen,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

export type NavTone =
  | "sky"
  | "cyan"
  | "teal"
  | "emerald"
  | "indigo"
  | "violet"
  | "amber"
  | "rose"
  | "slate";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  moduleKey: string;
  /** Category-at-a-glance color used for the item's hover tint + dot.
   *  The *active* item always uses the current accent theme instead
   *  (see app-sidebar.tsx) — tone is purely for telling modules apart
   *  at rest. */
  tone: NavTone;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Tailwind classes per tone, applied only when a nav item is NOT the
 *  active route (the active route always uses the accent theme). */
export const NAV_TONE_STYLES: Record<
  NavTone,
  { icon: string; hoverBg: string; dot: string }
> = {
  sky: {
    icon: "group-hover:text-sky-600 dark:group-hover:text-sky-400",
    hoverBg: "hover:bg-sky-500/8",
    dot: "bg-sky-500",
  },
  cyan: {
    icon: "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
    hoverBg: "hover:bg-cyan-500/8",
    dot: "bg-cyan-500",
  },
  teal: {
    icon: "group-hover:text-teal-600 dark:group-hover:text-teal-400",
    hoverBg: "hover:bg-teal-500/8",
    dot: "bg-teal-500",
  },
  emerald: {
    icon: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    hoverBg: "hover:bg-emerald-500/8",
    dot: "bg-emerald-500",
  },
  indigo: {
    icon: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
    hoverBg: "hover:bg-indigo-500/8",
    dot: "bg-indigo-500",
  },
  violet: {
    icon: "group-hover:text-violet-600 dark:group-hover:text-violet-400",
    hoverBg: "hover:bg-violet-500/8",
    dot: "bg-violet-500",
  },
  amber: {
    icon: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
    hoverBg: "hover:bg-amber-500/8",
    dot: "bg-amber-500",
  },
  rose: {
    icon: "group-hover:text-rose-600 dark:group-hover:text-rose-400",
    hoverBg: "hover:bg-rose-500/8",
    dot: "bg-rose-500",
  },
  slate: {
    icon: "group-hover:text-slate-600 dark:group-hover:text-slate-400",
    hoverBg: "hover:bg-slate-500/8",
    dot: "bg-slate-400",
  },
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        moduleKey: "dashboard",
        tone: "indigo",
      },
      {
        title: "Debrief",
        href: "/debrief",
        icon: ClipboardCheck,
        moduleKey: "debrief",
        tone: "emerald",
      },
      {
        title: "Bookings",
        href: "/bookings",
        icon: Boxes,
        moduleKey: "bookings",
        tone: "sky",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Export Invoices",
        href: "/invoices",
        icon: FileText,
        moduleKey: "invoices",
        tone: "indigo",
      },
      {
        title: "Truck Dispatch",
        href: "/dispatches",
        icon: Truck,
        moduleKey: "dispatches",
        tone: "amber",
      },
      {
        title: "Factory Stuffing",
        href: "/stuffing",
        icon: Container,
        moduleKey: "stuffing",
        tone: "teal",
      },
      {
        title: "Gate In",
        href: "/gate-in",
        icon: DoorOpen,
        moduleKey: "gate-in",
        tone: "cyan",
      },
      {
        title: "Shipping Instructions",
        href: "/shipping-instructions",
        icon: Send,
        moduleKey: "shipping-instructions",
        tone: "violet",
      },
      {
        title: "Shipped on Board",
        href: "/sob",
        icon: Anchor,
        moduleKey: "bills-of-lading",
        tone: "emerald",
      },
    ],
  },
  {
    title: "Records",
    items: [
      {
        title: "Documents",
        href: "/documents",
        icon: FolderOpen,
        moduleKey: "documents",
        tone: "slate",
      },
      {
        title: "Customers",
        href: "/customers",
        icon: Users,
        moduleKey: "customers",
        tone: "rose",
      },
      {
        title: "Reports",
        href: "/reports",
        icon: BarChart3,
        moduleKey: "reports",
        tone: "indigo",
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        moduleKey: "settings",
        tone: "slate",
      },
    ],
  },
];
