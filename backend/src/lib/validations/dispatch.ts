import { z } from "zod";

export const dispatchSchema = z.object({
  bookingId: z.string().min(1, "Booking is required"),
  truckNumber: z.string().min(1, "Truck number is required"),
  driverName: z.string().min(1, "Driver name is required"),
  driverMobile: z.string().min(1, "Driver mobile is required"),
  transporterId: z.string().min(1, "Transporter is required"),
  material: z.string().min(1, "Material is required"),
  referenceNumber: z.string().optional(),
  lrNumber: z.string().optional(),
  numberOfWeights: z.coerce.number().optional(),
  numberOfBlocks: z.coerce.number().int().optional(),
  dispatchDate: z.string().min(1, "Dispatch date is required"),
  expectedFactoryArrival: z.string().min(1, "Expected arrival is required"),
});
export type DispatchInput = z.infer<typeof dispatchSchema>;
