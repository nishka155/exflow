import { z } from "zod";

export const billOfLadingSchema = z.object({
  blNumber: z.string().optional(),
  blDate: z.string().optional(),
  consignorName: z.string().min(1, "Consignor is required"),
  consignorAddress: z.string().optional(),
  consigneeName: z.string().min(1, "Consignee is required"),
  consigneeAddress: z.string().optional(),
  notifyPartyName: z.string().optional(),
  notifyPartyAddress: z.string().optional(),
  pol: z.string().min(1, "POL is required"),
  pod: z.string().min(1, "POD is required"),
  vessel: z.string().optional(),
  voyage: z.string().optional(),
  containerNumber: z.string().optional(),
  sealNumber: z.string().optional(),
  commodity: z.string().min(1, "Commodity is required"),
  packageCount: z.coerce.number().int().optional(),
  weight: z.coerce.number().optional(),
  freightTerms: z.string().optional(),
});
export type BillOfLadingInput = z.infer<typeof billOfLadingSchema>;

export const BL_COMPARE_FIELDS = [
  ["consigneeName", "Consignee"],
  ["consigneeAddress", "Consignee Address"],
  ["notifyPartyName", "Notify Party"],
  ["pol", "POL"],
  ["pod", "POD"],
  ["vessel", "Vessel"],
  ["voyage", "Voyage"],
  ["containerNumber", "Container Number"],
  ["sealNumber", "Seal Number"],
  ["commodity", "Commodity"],
  ["packageCount", "Package Count"],
  ["freightTerms", "Freight Terms"],
] as const;
