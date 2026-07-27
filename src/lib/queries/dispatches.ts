import { prisma } from "@/lib/prisma";

export async function listDispatches(organizationId: string) {
  return prisma.truckDispatch.findMany({
    where: { organizationId },
    include: { shipment: { include: { customer: true } }, transporter: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDispatchById(id: string, organizationId: string) {
  return prisma.truckDispatch.findFirst({
    where: { id, organizationId },
    include: {
      shipment: { include: { customer: true } },
      transporter: true,
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function listShipmentOptions(organizationId: string) {
  return prisma.shipment.findMany({
    where: { organizationId },
    include: { customer: true, invoice: true },
    orderBy: { createdAt: "desc" },
  });
}
