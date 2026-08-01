import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";

const router = Router();

router.use(requireAuth, requireRole("reports"));

router.get("/", async (req, res, next) => {
  try {
    const organizationId = req.user!.organizationId;

    const [customers, transporters, delays, stuffingBySize, invoices, countryGrouped] =
      await Promise.all([
        prisma.customer.findMany({
          where: { organizationId },
          include: {
            bookings: { select: { id: true } },
            invoices: { select: { totalAmount: true, status: true } },
          },
          orderBy: { name: "asc" },
        }),
        prisma.transporter.findMany({
          where: { organizationId },
          include: { truckDispatches: { select: { status: true } } },
          orderBy: { name: "asc" },
        }),
        prisma.truckDispatch.findMany({
          where: { organizationId, status: "DELAY" },
          include: { booking: { include: { customer: true } }, transporter: true },
          orderBy: { expectedFactoryArrival: "asc" },
        }),
        prisma.factoryStuffing.groupBy({
          by: ["containerSize"],
          where: { organizationId },
          _count: { _all: true },
          _avg: { grossWeight: true, netWeight: true },
        }),
        prisma.invoice.findMany({
          where: { organizationId, status: "COMPLETED" },
          select: { invoiceDate: true, totalAmount: true, currency: true, exportCountry: true },
        }),
        prisma.invoice.groupBy({
          by: ["exportCountry"],
          where: { organizationId },
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
      ]);

    const customerReport = customers.map((c) => ({
      id: c.id,
      name: c.name,
      country: c.country,
      bookingCount: c.bookings.length,
      revenue: c.invoices
        .filter((i) => i.status === "COMPLETED")
        .reduce((sum, i) => sum + Number(i.totalAmount), 0),
    }));

    const transporterReport = transporters.map((t) => ({
      id: t.id,
      name: t.name,
      totalDispatches: t.truckDispatches.length,
      delayed: t.truckDispatches.filter((d) => d.status === "DELAY").length,
      reachedFactory: t.truckDispatches.filter((d) => d.status === "REACHED_FACTORY").length,
    }));

    const containerUtilizationReport = stuffingBySize.map((s) => ({
      containerSize: s.containerSize,
      count: s._count._all,
      avgGrossWeight: s._avg.grossWeight ? Number(s._avg.grossWeight) : 0,
      avgNetWeight: s._avg.netWeight ? Number(s._avg.netWeight) : 0,
    }));

    const byMonth = new Map<string, number>();
    for (const inv of invoices) {
      const key = `${inv.invoiceDate.getFullYear()}-${String(inv.invoiceDate.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(inv.totalAmount));
    }
    const revenueReport = Array.from(byMonth.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const exportCountryReport = countryGrouped
      .map((g) => ({
        country: g.exportCountry,
        bookings: g._count._all,
        revenue: Number(g._sum.totalAmount ?? 0),
      }))
      .sort((a, b) => b.bookings - a.bookings);

    res.json({
      customers: customerReport,
      transporters: transporterReport,
      delays,
      containerUtilization: containerUtilizationReport,
      revenue: revenueReport,
      exportCountries: exportCountryReport,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
