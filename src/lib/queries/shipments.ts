import { prisma } from "@/lib/prisma";

export async function generateNextShipmentNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const count = await prisma.shipment.count({ where: { organizationId } });
  return `EXF-${year}-${String(count + 1).padStart(6, "0")}`;
}
