import { z } from "zod";

export const inventoryItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  sku: z.string().optional(),
  hsnCode: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  reorderLevel: z.coerce.number().min(0).optional(),
  unitValue: z.coerce.number().min(0).optional(),
  location: z.string().optional(),
  supplier: z.string().optional(),
  supplierContact: z.string().optional(),
  notes: z.string().optional(),
});
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

export const inventoryMovementSchema = z.object({
  type: z.enum(["IN", "OUT", "RETURN", "DAMAGED", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"]),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  reason: z.string().optional(),
  referenceNumber: z.string().optional(),
  bookingId: z.string().optional(),
});
export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;

export const inventoryBulkImportSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        sku: z.string().optional(),
        hsnCode: z.string().optional(),
        category: z.string().optional(),
        unit: z.string().min(1),
        openingStock: z.coerce.number().min(0).optional(),
        reorderLevel: z.coerce.number().min(0).optional(),
        unitValue: z.coerce.number().min(0).optional(),
        location: z.string().optional(),
        supplier: z.string().optional(),
        supplierContact: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1)
    .max(500),
});
export type InventoryBulkImportInput = z.infer<typeof inventoryBulkImportSchema>;
