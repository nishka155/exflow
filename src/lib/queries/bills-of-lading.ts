import { prisma } from "@/lib/prisma";

export async function listBillsOfLading(organizationId: string) {
  return prisma.billOfLading.findMany({
    where: { organizationId },
    include: { shipment: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBillOfLadingById(id: string, organizationId: string) {
  return prisma.billOfLading.findFirst({
    where: { id, organizationId },
    include: {
      shipment: { include: { customer: true } },
      shippingInstruction: true,
      revisions: { orderBy: { revisionNumber: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function listSisAwaitingBL(organizationId: string) {
  return prisma.shippingInstruction.findMany({
    where: { organizationId, status: "CONFIRMED", billOfLading: null },
    include: { shipment: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });
}
