import { prisma } from "@/lib/prisma";

export async function listGateIns(organizationId: string) {
  return prisma.gateIn.findMany({
    where: { organizationId },
    include: { shipment: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGateInById(id: string, organizationId: string) {
  return prisma.gateIn.findFirst({
    where: { id, organizationId },
    include: {
      shipment: { include: { customer: true } },
      factoryStuffing: true,
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function listStuffingsAwaitingGateIn(organizationId: string) {
  return prisma.factoryStuffing.findMany({
    where: { organizationId, status: "COMPLETED", gateIn: null },
    include: { shipment: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });
}
