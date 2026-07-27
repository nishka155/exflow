import { prisma } from "@/lib/prisma";

export async function listShippingInstructions(organizationId: string) {
  return prisma.shippingInstruction.findMany({
    where: { organizationId },
    include: { shipment: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getShippingInstructionById(id: string, organizationId: string) {
  return prisma.shippingInstruction.findFirst({
    where: { id, organizationId },
    include: {
      shipment: { include: { customer: true } },
      billOfLading: true,
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function listShipmentsAwaitingSI(organizationId: string) {
  return prisma.shipment.findMany({
    where: { organizationId, gateIn: { isNot: null }, shippingInstruction: null },
    include: {
      customer: true,
      invoice: true,
      factoryStuffing: true,
      gateIn: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
