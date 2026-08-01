import { prisma } from "../prisma";

/**
 * Heuristic duplicate-invoice detection: same customer + same material,
 * raised within a week of each other, with a total amount within 10% of
 * one another. No ML — just a similarity rule of thumb to catch accidental
 * re-entry (e.g. a data-entry clerk re-keying the same booking twice).
 */
export async function findPossibleDuplicateInvoices(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

  const windowStart = new Date(invoice.invoiceDate);
  windowStart.setDate(windowStart.getDate() - 7);
  const windowEnd = new Date(invoice.invoiceDate);
  windowEnd.setDate(windowEnd.getDate() + 7);

  const candidates = await prisma.invoice.findMany({
    where: {
      id: { not: invoiceId },
      organizationId: invoice.organizationId,
      customerId: invoice.customerId,
      material: invoice.material,
      invoiceDate: { gte: windowStart, lte: windowEnd },
    },
    select: { id: true, invoiceNumber: true, invoiceDate: true, totalAmount: true, status: true },
  });

  const total = Number(invoice.totalAmount);
  return candidates.filter((c) => {
    const diff = Math.abs(Number(c.totalAmount) - total);
    return total === 0 || diff / total <= 0.1;
  });
}
