import { prisma } from "@/lib/prisma";
import type { DocumentCategory } from "@prisma/client";

export async function listDocuments(
  organizationId: string,
  filters?: { search?: string; category?: DocumentCategory }
) {
  return prisma.document.findMany({
    where: {
      organizationId,
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.search
        ? { fileName: { contains: filters.search, mode: "insensitive" } }
        : {}),
    },
    include: {
      shipment: { select: { shipmentNumber: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
