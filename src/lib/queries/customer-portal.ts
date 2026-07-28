import { prisma } from "@/lib/prisma";

export async function getCustomerForPortalUser(userId: string) {
  return prisma.customer.findUnique({ where: { portalUserId: userId } });
}

export async function getPortalShipments(customerId: string) {
  return prisma.shipment.findMany({
    where: { customerId },
    include: { invoice: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPortalShipmentDetail(id: string, customerId: string) {
  return prisma.shipment.findFirst({
    where: { id, customerId },
    include: {
      invoice: true,
      truckDispatches: { include: { transporter: true }, orderBy: { createdAt: "asc" } },
      factoryStuffing: true,
      gateIn: true,
      shippingInstruction: true,
      billOfLading: true,
      documents: { orderBy: { createdAt: "desc" } },
      timelineEvents: { orderBy: { occurredAt: "asc" } },
    },
  });
}

export async function getPortalInvoices(customerId: string) {
  return prisma.invoice.findMany({
    where: { customerId },
    include: { shipment: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPortalDocuments(customerId: string) {
  return prisma.document.findMany({
    where: { shipment: { customerId } },
    include: { shipment: { select: { shipmentNumber: true } } },
    orderBy: { createdAt: "desc" },
  });
}
