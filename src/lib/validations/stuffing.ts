import { z } from "zod";

export const stuffingSchema = z.object({
  shipmentId: z.string().min(1, "Shipment is required"),
  containerNumber: z.string().min(1, "Container number is required"),
  containerSize: z.enum(["FT20", "FT40", "FT40_HC"]),
  sealNumber: z.string().optional(),
  contactNumber: z.string().optional(),
  transporterId: z.string().optional(),
  pol: z.string().min(1, "POL is required"),
  pod: z.string().min(1, "POD is required"),
  numberOfBoxes: z.coerce.number().int().optional(),
  grossWeight: z.coerce.number().optional(),
  netWeight: z.coerce.number().optional(),
});
export type StuffingInput = z.infer<typeof stuffingSchema>;
