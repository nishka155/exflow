import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { getAtRiskDispatches } from "../lib/ai/delay-risk";

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

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const organizationId = req.user!.organizationId;
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const monthStart = startOfMonth();

    const [
      activeBookings,
      bookingPending,
      todaysDispatches,
      todaysStuffing,
      containersWaiting,
      gateInPending,
      pendingSI,
      pendingBL,
      sobPending,
      containersInTransit,
      deliveredContainers,
      delayedTrucks,
      bookingsThisMonth,
      revenueAgg,
      stageBreakdown,
      countryBreakdown,
      recentEvents,
      notifications,
      atRiskDispatches,
    ] = await Promise.all([
      prisma.booking.count({
        where: { organizationId, currentStage: { not: "COMPLETED" } },
      }),
      prisma.booking.count({
        where: { organizationId, invoice: null },
      }),
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
      prisma.booking.count({
        where: { organizationId, currentStage: "GATE_IN" },
      }),
      prisma.booking.count({
        where: {
          organizationId,
          OR: [
            { currentStage: "SHIPPING_INSTRUCTION" },
            { billOfLading: { status: { not: "FINAL" } } },
          ],
        },
      }),
      prisma.shippedOnBoard.count({
        where: { organizationId, status: "PENDING" },
      }),
      prisma.factoryStuffing.count({
        where: { organizationId, gateIn: { isNot: null }, actualArrival: null },
      }),
      prisma.factoryStuffing.count({
        where: { organizationId, actualArrival: { not: null } },
      }),
      prisma.truckDispatch.count({
        where: { organizationId, status: "DELAY" },
      }),
      prisma.booking.count({
        where: { organizationId, createdAt: { gte: monthStart } },
      }),
      prisma.invoice.aggregate({
        where: { organizationId, status: "COMPLETED" },
        _sum: { totalAmount: true },
      }),
      prisma.booking.groupBy({
        by: ["currentStage"],
        where: { organizationId },
        _count: { _all: true },
      }),
      prisma.invoice.groupBy({
        by: ["exportCountry"],
        where: { organizationId },
        _count: { _all: true },
      }),
      prisma.bookingTimelineEvent.findMany({
        where: { booking: { organizationId } },
        orderBy: { occurredAt: "desc" },
        take: 8,
        include: {
          booking: { select: { bookingNumber: true } },
          actor: { select: { name: true } },
        },
      }),
      prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      getAtRiskDispatches(organizationId),
    ]);

    res.json({
      kpis: {
        activeBookings,
        bookingPending,
        todaysDispatches,
        todaysStuffing,
        containersWaiting,
        gateInPending,
        pendingSI,
        pendingBL,
        sobPending,
        containersInTransit,
        deliveredContainers,
        delayedTrucks,
        bookingsThisMonth,
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
      notifications,
      atRiskDispatches,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
