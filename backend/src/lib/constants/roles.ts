export const ROLES = [
  "ADMIN",
  "EXPORT_MANAGER",
  "DOCUMENTATION_EXECUTIVE",
  "FACTORY_USER",
  "TRANSPORT_COORDINATOR",
  "ACCOUNTS",
  "CUSTOMER",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  EXPORT_MANAGER: "Export Manager",
  DOCUMENTATION_EXECUTIVE: "Documentation Executive",
  FACTORY_USER: "Factory User",
  TRANSPORT_COORDINATOR: "Transport Coordinator",
  ACCOUNTS: "Accounts",
  CUSTOMER: "Customer",
};

/**
 * Modules a role is allowed to see/act on. Checked by nav rendering and by
 * server-side guards in each route group. ADMIN always has full access.
 */
export const ROLE_MODULES: Record<Role, string[]> = {
  ADMIN: [
    "dashboard",
    "invoices",
    "dispatches",
    "stuffing",
    "gate-in",
    "shipping-instructions",
    "bills-of-lading",
    "bookings",
    "documents",
    "customers",
    "reports",
    "settings",
  ],
  EXPORT_MANAGER: [
    "dashboard",
    "invoices",
    "dispatches",
    "stuffing",
    "gate-in",
    "shipping-instructions",
    "bills-of-lading",
    "bookings",
    "documents",
    "customers",
    "reports",
    "settings",
  ],
  DOCUMENTATION_EXECUTIVE: [
    "dashboard",
    "invoices",
    "shipping-instructions",
    "bills-of-lading",
    "bookings",
    "documents",
    "reports",
    "settings",
  ],
  FACTORY_USER: ["dashboard", "stuffing", "gate-in", "bookings", "documents", "settings"],
  TRANSPORT_COORDINATOR: ["dashboard", "dispatches", "bookings", "documents", "settings"],
  ACCOUNTS: ["dashboard", "invoices", "customers", "reports", "settings"],
  CUSTOMER: ["portal"],
};

export function roleCanAccess(role: Role, moduleKey: string) {
  return ROLE_MODULES[role]?.includes(moduleKey) ?? false;
}
