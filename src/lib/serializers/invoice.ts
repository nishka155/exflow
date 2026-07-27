import type { Invoice } from "@prisma/client";

export type SerializedInvoice = Omit<
  Invoice,
  "quantity" | "weight" | "unitPrice" | "gstPercent" | "gstAmount" | "totalAmount" | "invoiceDate" | "createdAt" | "updatedAt"
> & {
  quantity: number;
  weight: number;
  unitPrice: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  invoiceDate: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeInvoice(invoice: Invoice): SerializedInvoice {
  return {
    ...invoice,
    quantity: Number(invoice.quantity),
    weight: Number(invoice.weight),
    unitPrice: Number(invoice.unitPrice),
    gstPercent: Number(invoice.gstPercent),
    gstAmount: Number(invoice.gstAmount),
    totalAmount: Number(invoice.totalAmount),
    invoiceDate: invoice.invoiceDate.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}
