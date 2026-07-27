import { prisma } from "@/lib/prisma";

export async function listShipmentsForOrg(organizationId: string) {
  return prisma.shipment.findMany({
    where: { organizationId },
    include: { customer: true, invoice: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getShipmentMaster(id: string, organizationId: string) {
  return prisma.shipment.findFirst({
    where: { id, organizationId },
    include: {
      customer: true,
      invoice: true,
      truckDispatches: { include: { transporter: true }, orderBy: { createdAt: "asc" } },
      factoryStuffing: true,
      gateIn: true,
      shippingInstruction: true,
      billOfLading: true,
      documents: { orderBy: { createdAt: "desc" } },
      comments: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      timelineEvents: {
        include: { actor: { select: { name: true } } },
        orderBy: { occurredAt: "asc" },
      },
    },
  });
}
