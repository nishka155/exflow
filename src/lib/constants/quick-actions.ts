import { FilePlus2, Truck, Container, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface QuickAction {
  title: string;
  href: string;
  icon: LucideIcon;
  moduleKey: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { title: "New Booking", href: "/bookings/new", icon: FilePlus2, moduleKey: "bookings" },
  { title: "Truck Dispatch", href: "/dispatches/new", icon: Truck, moduleKey: "dispatches" },
  { title: "Factory Stuffing", href: "/stuffing", icon: Container, moduleKey: "stuffing" },
  { title: "Generate SI", href: "/shipping-instructions/new", icon: Send, moduleKey: "shipping-instructions" },
];
