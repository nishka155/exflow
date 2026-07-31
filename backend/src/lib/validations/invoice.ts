import { z } from "zod";

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  customerId: z.string().min(1, "Customer is required"),
  buyerName: z.string().min(1, "Buyer name is required"),
  buyerAddress: z.string().optional(),
  poNumber: z.string().optional(),
  material: z.string().min(1, "Material is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  quantityUnit: z.string().min(1).default("MT"),
  weight: z.coerce.number().positive("Weight must be positive"),
  weightUnit: z.string().min(1).default("KG"),
  numberOfBlocks: z.coerce.number().int().optional(),
  hsnCode: z.string().min(1, "HSN code is required"),
  unitPrice: z.coerce.number().positive("Unit price must be positive"),
  currency: z.string().min(1).default("USD"),
  gstPercent: z.coerce.number().min(0).default(0),
  exportCountry: z.string().min(1, "Export country is required"),
});
export type InvoiceInput = z.infer<typeof invoiceSchema>;

export function computeInvoiceTotals(input: Pick<InvoiceInput, "quantity" | "unitPrice" | "gstPercent">) {
  const subtotal = input.quantity * input.unitPrice;
  const gstAmount = subtotal * (input.gstPercent / 100);
  const totalAmount = subtotal + gstAmount;
  return { subtotal, gstAmount, totalAmount };
}
