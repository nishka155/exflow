import { prisma } from "@/lib/prisma";

export async function listStuffings(organizationId: string) {
  return prisma.factoryStuffing.findMany({
    where: { organizationId },
    include: { shipment: { include: { customer: true } }, transporter: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStuffingById(id: string, organizationId: string) {
  return prisma.factoryStuffing.findFirst({
    where: { id, organizationId },
    include: {
      shipment: { include: { customer: true, truckDispatches: true } },
      transporter: true,
      gateIn: true,
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function listShipmentsWithoutStuffing(organizationId: string) {
  return prisma.shipment.findMany({
    where: { organizationId, factoryStuffing: null },
    include: { customer: true, invoice: true },
    orderBy: { createdAt: "desc" },
  });
}
