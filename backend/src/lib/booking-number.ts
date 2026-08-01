import { prisma } from "./prisma";

// bookingNumber is a globally-unique column while the count used to build it
// is scoped per-org, so once more than one org exists the naive count-based
// candidate can already be taken by another org's booking — retry past
// collisions instead of letting the unique constraint throw.
export async function generateNextBookingNumber(organizationId: string) {
  const year = new Date().getFullYear();
  let count = await prisma.booking.count({ where: { organizationId } });
  let candidate = `BK-${year}-${String(count + 1).padStart(5, "0")}`;
  while (await prisma.booking.findUnique({ where: { bookingNumber: candidate } })) {
    count += 1;
    candidate = `BK-${year}-${String(count + 1).padStart(5, "0")}`;
  }
  return candidate;
}
