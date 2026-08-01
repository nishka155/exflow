export type StatusTone =
  | "neutral"
  | "info"
  | "brand"
  | "success"
  | "warning"
  | "destructive";

export interface StatusConfig {
  label: string;
  tone: StatusTone;
}

export const INVOICE_STATUS = ["DRAFT", "APPROVED", "COMPLETED"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[number];
export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, StatusConfig> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  APPROVED: { label: "Approved", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
};

export const DISPATCH_STATUS = [
  "PENDING",
  "DISPATCHED",
  "REACHED_FACTORY",
  "DELAY",
] as const;
export type DispatchStatus = (typeof DISPATCH_STATUS)[number];
export const DISPATCH_STATUS_CONFIG: Record<DispatchStatus, StatusConfig> = {
  PENDING: { label: "Pending", tone: "neutral" },
  DISPATCHED: { label: "Dispatched", tone: "info" },
  REACHED_FACTORY: { label: "Reached Factory", tone: "success" },
  DELAY: { label: "Delay", tone: "destructive" },
};

export const STUFFING_STATUS = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;
export type StuffingStatus = (typeof STUFFING_STATUS)[number];
export const STUFFING_STATUS_CONFIG: Record<StuffingStatus, StatusConfig> = {
  SCHEDULED: { label: "Scheduled", tone: "neutral" },
  IN_PROGRESS: { label: "In Progress", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
};

export const GATE_IN_STATUS = ["PENDING", "COMPLETED"] as const;
export type GateInStatus = (typeof GATE_IN_STATUS)[number];
export const GATE_IN_STATUS_CONFIG: Record<GateInStatus, StatusConfig> = {
  PENDING: { label: "Pending", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
};

export const SI_STATUS = ["DRAFT", "SENT", "CONFIRMED"] as const;
export type SIStatus = (typeof SI_STATUS)[number];
export const SI_STATUS_CONFIG: Record<SIStatus, StatusConfig> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SENT: { label: "Sent to Line", tone: "info" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
};

export const BL_STATUS = ["DRAFT", "MISMATCH", "FINAL"] as const;
export type BLStatus = (typeof BL_STATUS)[number];
export const BL_STATUS_CONFIG: Record<BLStatus, StatusConfig> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  MISMATCH: { label: "Mismatch Found", tone: "destructive" },
  FINAL: { label: "Final", tone: "success" },
};

export const BOOKING_STAGE = [
  "INVOICE",
  "DISPATCH",
  "STUFFING",
  "GATE_IN",
  "SHIPPING_INSTRUCTION",
  "BILL_OF_LADING",
  "SOB",
  "COMPLETED",
] as const;
export type BookingStage = (typeof BOOKING_STAGE)[number];
export const BOOKING_STAGE_CONFIG: Record<BookingStage, StatusConfig> = {
  INVOICE: { label: "Invoice", tone: "neutral" },
  DISPATCH: { label: "Truck Dispatch", tone: "info" },
  STUFFING: { label: "Factory Stuffing", tone: "info" },
  GATE_IN: { label: "Gate In", tone: "info" },
  SHIPPING_INSTRUCTION: { label: "Shipping Instruction", tone: "warning" },
  BILL_OF_LADING: { label: "Bill of Lading", tone: "warning" },
  SOB: { label: "Shipped on Board", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
};

export const SOB_STATUS = ["PENDING", "COMPLETED"] as const;
export type SobStatus = (typeof SOB_STATUS)[number];
export const SOB_STATUS_CONFIG: Record<SobStatus, StatusConfig> = {
  PENDING: { label: "Pending", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
};

export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  info: "bg-info/15 text-info border-transparent dark:text-info",
  brand: "bg-brand/15 text-brand border-transparent",
  success: "bg-success/15 text-success border-transparent",
  warning: "bg-warning/20 text-warning-foreground border-transparent dark:text-warning",
  destructive: "bg-destructive/15 text-destructive border-transparent",
};
