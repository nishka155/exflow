import { prisma } from "@/lib/prisma";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getDashboardData(organizationId: string) {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const monthStart = startOfMonth();

  const [
    todaysDispatches,
    todaysStuffing,
    containersWaiting,
    gateInPending,
    pendingSI,
    pendingBL,
    delayedTrucks,
    shipmentsThisMonth,
    revenueAgg,
    stageBreakdown,
    countryBreakdown,
    recentEvents,
  ] = await Promise.all([
    prisma.truckDispatch.count({
      where: { organizationId, dispatchDate: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.factoryStuffing.count({
      where: { organizationId, stuffingStartTime: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.factoryStuffing.count({
      where: { organizationId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
    }),
    prisma.factoryStuffing.count({
      where: { organizationId, status: "COMPLETED", gateIn: null },
    }),
    prisma.shipment.count({
      where: {
        organizationId,
        currentStage: "GATE_IN",
      },
    }),
    prisma.shipment.count({
      where: {
        organizationId,
        OR: [
          { currentStage: "SHIPPING_INSTRUCTION" },
          { billOfLading: { status: { not: "FINAL" } } },
        ],
      },
    }),
    prisma.truckDispatch.count({
      where: { organizationId, status: "DELAY" },
    }),
    prisma.shipment.count({
      where: { organizationId, createdAt: { gte: monthStart } },
    }),
    prisma.invoice.aggregate({
      where: { organizationId, status: "COMPLETED" },
      _sum: { totalAmount: true },
    }),
    prisma.shipment.groupBy({
      by: ["currentStage"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.invoice.groupBy({
      by: ["exportCountry"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.shipmentTimelineEvent.findMany({
      where: { shipment: { organizationId } },
      orderBy: { occurredAt: "desc" },
      take: 8,
      include: {
        shipment: { select: { shipmentNumber: true } },
        actor: { select: { name: true } },
      },
    }),
  ]);

  return {
    kpis: {
      todaysDispatches,
      todaysStuffing,
      containersWaiting,
      gateInPending,
      pendingSI,
      pendingBL,
      delayedTrucks,
      shipmentsThisMonth,
      revenue: Number(revenueAgg._sum.totalAmount ?? 0),
    },
    stageBreakdown: stageBreakdown.map((s) => ({
      stage: s.currentStage,
      count: s._count._all,
    })),
    countryBreakdown: countryBreakdown
      .map((c) => ({ country: c.exportCountry, count: c._count._all }))
      .sort((a, b) => b.count - a.count),
    recentEvents,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
