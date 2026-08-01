import { z } from "zod";

export const shippingInstructionSchema = z.object({
  bookingId: z.string().min(1, "Booking is required"),
  consignorName: z.string().min(1, "Consignor is required"),
  consignorAddress: z.string().optional(),
  consigneeName: z.string().min(1, "Consignee is required"),
  consigneeAddress: z.string().optional(),
  notifyPartyName: z.string().optional(),
  notifyPartyAddress: z.string().optional(),
  pol: z.string().min(1, "POL is required"),
  pod: z.string().min(1, "POD is required"),
  commodity: z.string().min(1, "Commodity is required"),
  hsCode: z.string().optional(),
  packageCount: z.coerce.number().int().optional(),
  weight: z.coerce.number().optional(),
  marks: z.string().optional(),
  containerNumber: z.string().optional(),
  sealNumber: z.string().optional(),
  freightTerms: z.string().optional(),
  incoterms: z.string().optional(),
  shippingLine: z.string().optional(),
  voyage: z.string().optional(),
  vessel: z.string().optional(),
});
export type ShippingInstructionInput = z.infer<typeof shippingInstructionSchema>;
