import { prisma } from "@/lib/prisma";

// shipmentNumber is a globally-unique column while the count used to build it
// is scoped per-org, so once more than one org exists the naive count-based
// candidate can already be taken by another org's shipment — retry past
// collisions instead of letting the unique constraint throw.
export async function generateNextShipmentNumber(organizationId: string) {
  const year = new Date().getFullYear();
  let count = await prisma.shipment.count({ where: { organizationId } });
  let candidate = `EXF-${year}-${String(count + 1).padStart(6, "0")}`;
  while (await prisma.shipment.findUnique({ where: { shipmentNumber: candidate } })) {
    count += 1;
    candidate = `EXF-${year}-${String(count + 1).padStart(6, "0")}`;
  }
  return candidate;
}
