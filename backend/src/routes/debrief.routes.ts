import { Router } from "express";

import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
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

const router = Router();

// CEO/manager-only — matches the "debrief" moduleKey in ROLE_MODULES.
router.use(requireAuth, requireRole("debrief"));

router.get("/", async (req, res, next) => {
  try {
    const organizationId = req.user!.organizationId;
    const todayStart = startOfToday();
    const todayEnd = endOfToday();

    const [trucksToday, stuffingPendingToday, gateInsToday, atRiskDispatches] = await Promise.all([
      prisma.truckDispatch.findMany({
        where: { organizationId, expectedFactoryArrival: { gte: todayStart, lte: todayEnd } },
        include: { booking: { include: { customer: true } }, transporter: true },
        orderBy: { expectedFactoryArrival: "asc" },
      }),
      prisma.factoryStuffing.findMany({
        where: {
          organizationId,
          stuffingStartTime: { gte: todayStart, lte: todayEnd },
          status: { not: "COMPLETED" },
        },
        include: { booking: { include: { customer: true } }, transporter: true },
        orderBy: { stuffingStartTime: "asc" },
      }),
      prisma.gateIn.findMany({
        where: { organizationId, gateInDate: { gte: todayStart, lte: todayEnd } },
        include: { booking: { include: { customer: true } } },
        orderBy: { gateInDate: "asc" },
      }),
      getAtRiskDispatches(organizationId),
    ]);

    res.json({
      date: todayStart.toISOString(),
      trucksToday: trucksToday.map((t) => ({
        id: t.id,
        truckNumber: t.truckNumber,
        driverName: t.driverName,
        driverMobile: t.driverMobile,
        transporterName: t.transporter.name,
        expectedFactoryArrival: t.expectedFactoryArrival,
        status: t.status,
        bookingId: t.bookingId,
        bookingNumber: t.booking.bookingNumber,
        customerName: t.booking.customer.name,
      })),
      stuffingPendingToday: stuffingPendingToday.map((s) => ({
        id: s.id,
        containerNumber: s.containerNumber,
        status: s.status,
        stuffingStartTime: s.stuffingStartTime,
        pol: s.pol,
        pod: s.pod,
        transporterName: s.transporter?.name ?? null,
        bookingId: s.bookingId,
        bookingNumber: s.booking.bookingNumber,
        customerName: s.booking.customer.name,
      })),
      gateInsToday: gateInsToday.map((g) => ({
        id: g.id,
        containerNumber: g.containerNumber,
        terminal: g.terminal,
        status: g.status,
        gateInDate: g.gateInDate,
        bookingId: g.bookingId,
        bookingNumber: g.booking.bookingNumber,
        customerName: g.booking.customer.name,
      })),
      atRiskDispatches,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
