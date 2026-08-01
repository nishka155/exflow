import { z } from "zod";

export const bookingSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  exporterName: z.string().optional(),
  buyerName: z.string().optional(),
  pol: z.string().optional(),
  pod: z.string().optional(),
  shippingLine: z.string().optional(),
  vessel: z.string().optional(),
  etd: z.string().optional(),
  eta: z.string().optional(),
  freightTerms: z.string().optional(),
  commodity: z.string().optional(),
  deliveryDate: z.string().optional(),
});
export type BookingInput = z.infer<typeof bookingSchema>;
