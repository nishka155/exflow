import { prisma } from "@/lib/prisma";

export async function getCustomerReport(organizationId: string) {
  const customers = await prisma.customer.findMany({
    where: { organizationId },
    include: {
      shipments: { select: { id: true } },
      invoices: { select: { totalAmount: true, status: true } },
    },
    orderBy: { name: "asc" },
  });

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    country: c.country,
    shipmentCount: c.shipments.length,
    revenue: c.invoices
      .filter((i) => i.status === "COMPLETED")
      .reduce((sum, i) => sum + Number(i.totalAmount), 0),
  }));
}

export async function getTransporterReport(organizationId: string) {
  const transporters = await prisma.transporter.findMany({
    where: { organizationId },
    include: {
      truckDispatches: { select: { status: true } },
    },
    orderBy: { name: "asc" },
  });

  return transporters.map((t) => ({
    id: t.id,
    name: t.name,
    totalDispatches: t.truckDispatches.length,
    delayed: t.truckDispatches.filter((d) => d.status === "DELAY").length,
    reachedFactory: t.truckDispatches.filter((d) => d.status === "REACHED_FACTORY").length,
  }));
}

export async function getDelayReport(organizationId: string) {
  return prisma.truckDispatch.findMany({
    where: { organizationId, status: "DELAY" },
    include: { shipment: { include: { customer: true } }, transporter: true },
    orderBy: { expectedFactoryArrival: "asc" },
  });
}

export async function getContainerUtilizationReport(organizationId: string) {
  const stuffings = await prisma.factoryStuffing.groupBy({
    by: ["containerSize"],
    where: { organizationId },
    _count: { _all: true },
    _avg: { grossWeight: true, netWeight: true },
  });
  return stuffings.map((s) => ({
    containerSize: s.containerSize,
    count: s._count._all,
    avgGrossWeight: s._avg.grossWeight ? Number(s._avg.grossWeight) : 0,
    avgNetWeight: s._avg.netWeight ? Number(s._avg.netWeight) : 0,
  }));
}

export async function getRevenueReport(organizationId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { organizationId, status: "COMPLETED" },
    select: { invoiceDate: true, totalAmount: true, currency: true, exportCountry: true },
  });

  const byMonth = new Map<string, number>();
  for (const inv of invoices) {
    const key = `${inv.invoiceDate.getFullYear()}-${String(inv.invoiceDate.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(inv.totalAmount));
  }

  return Array.from(byMonth.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getExportCountryReport(organizationId: string) {
  const grouped = await prisma.invoice.groupBy({
    by: ["exportCountry"],
    where: { organizationId },
    _count: { _all: true },
    _sum: { totalAmount: true },
  });
  return grouped
    .map((g) => ({
      country: g.exportCountry,
      shipments: g._count._all,
      revenue: Number(g._sum.totalAmount ?? 0),
    }))
    .sort((a, b) => b.shipments - a.shipments);
}
