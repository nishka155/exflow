import { z } from "zod";

// Only bookingId is required — "Add Container" creates a bare row with sane
// defaults, immediately editable inline via stuffingUpdateSchema below.
export const stuffingSchema = z.object({
  bookingId: z.string().min(1, "Booking is required"),
  containerNumber: z.string().optional(),
  containerSize: z.enum(["FT20", "FT40", "FT40_HC"]).optional(),
  commodity: z.string().optional(),
  sealNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  contactNumber: z.string().optional(),
  transporterId: z.string().optional(),
  pol: z.string().optional(),
  pod: z.string().optional(),
  numberOfBoxes: z.coerce.number().int().optional(),
  numberOfBlocks: z.coerce.number().int().optional(),
  grossWeight: z.coerce.number().optional(),
  netWeight: z.coerce.number().optional(),
  lrGrNumber: z.string().optional(),
  deliveryDate: z.string().optional(),
});
export type StuffingInput = z.infer<typeof stuffingSchema>;

// Partial update — the grid PATCHes one or a few fields at a time, the
// drawer PATCHes the extended fields. Every field optional; only fields
// present in the request body get written (see stuffing.routes.ts PUT /:id).
export const stuffingUpdateSchema = z.object({
  containerNumber: z.string().min(1, "Container number is required").optional(),
  containerSize: z.enum(["FT20", "FT40", "FT40_HC"]).optional(),
  commodity: z.string().nullable().optional(),
  sealNumber: z.string().nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  contactNumber: z.string().nullable().optional(),
  transporterId: z.string().nullable().optional(),
  pol: z.string().optional(),
  pod: z.string().optional(),
  numberOfBoxes: z.coerce.number().int().nullable().optional(),
  numberOfBlocks: z.coerce.number().int().nullable().optional(),
  grossWeight: z.coerce.number().nullable().optional(),
  netWeight: z.coerce.number().nullable().optional(),
  lrGrNumber: z.string().nullable().optional(),
  deliveryDate: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  stuffingStartTime: z.string().nullable().optional(),
  stuffingEndTime: z.string().nullable().optional(),
});
export type StuffingUpdateInput = z.infer<typeof stuffingUpdateSchema>;
