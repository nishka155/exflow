import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Truck,
  Container,
  DoorOpen,
  Send,
  Ship,
  Boxes,
  FolderOpen,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  moduleKey: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        moduleKey: "dashboard",
      },
      {
        title: "Shipments",
        href: "/shipments",
        icon: Boxes,
        moduleKey: "shipments",
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
      },
      {
        title: "Truck Dispatch",
        href: "/dispatches",
        icon: Truck,
        moduleKey: "dispatches",
      },
      {
        title: "Factory Stuffing",
        href: "/stuffing",
        icon: Container,
        moduleKey: "stuffing",
      },
      {
        title: "Gate In",
        href: "/gate-in",
        icon: DoorOpen,
        moduleKey: "gate-in",
      },
      {
        title: "Shipping Instructions",
        href: "/shipping-instructions",
        icon: Send,
        moduleKey: "shipping-instructions",
      },
      {
        title: "Bill of Lading",
        href: "/bills-of-lading",
        icon: Ship,
        moduleKey: "bills-of-lading",
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
      },
      {
        title: "Customers",
        href: "/customers",
        icon: Users,
        moduleKey: "customers",
      },
      {
        title: "Reports",
        href: "/reports",
        icon: BarChart3,
        moduleKey: "reports",
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
      },
    ],
  },
];
