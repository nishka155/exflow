import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  gstNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;
