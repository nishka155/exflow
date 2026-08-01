import { z } from "zod";

export const gateInSchema = z.object({
  factoryStuffingId: z.string().min(1, "Container / stuffing record is required"),
  gateInDate: z.string().min(1, "Gate in date is required"),
  terminal: z.string().min(1, "Terminal is required"),
  yard: z.string().optional(),
  vehicleNumber: z.string().optional(),
  form13Updated: z.coerce.boolean().optional(),
  gatePass: z.string().optional(),
  eirNumber: z.string().optional(),
  remarks: z.string().optional(),
});
export type GateInInput = z.infer<typeof gateInSchema>;
