import { prisma } from "@/lib/prisma";
import type { InvoiceStatus } from "@/lib/constants/statuses";

export async function listInvoices(
  organizationId: string,
  filters?: { status?: InvoiceStatus; search?: string }
) {
  return prisma.invoice.findMany({
    where: {
      organizationId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            OR: [
              { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
              { buyerName: { contains: filters.search, mode: "insensitive" } },
              { material: { contains: filters.search, mode: "insensitive" } },
              { poNumber: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { customer: true, shipment: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoiceById(id: string, organizationId: string) {
  return prisma.invoice.findFirst({
    where: { id, organizationId },
    include: {
      customer: true,
      shipment: true,
      createdBy: { select: { name: true } },
      versions: { orderBy: { versionNumber: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
}
