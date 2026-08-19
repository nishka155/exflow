import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { HttpError } from "../middleware/error-handler";
import { bookingSchema } from "../lib/validations/booking";
import { generateNextBookingNumber } from "../lib/booking-number";
import { fetchAndCacheTracking } from "../lib/tracking/tracker";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { withoutStuffing, awaitingSI } = req.query as {
      withoutStuffing?: string;
      awaitingSI?: string;
    };
    const bookings = await prisma.booking.findMany({
      where: {
        organizationId: req.user!.organizationId,
        ...(withoutStuffing === "true" ? { factoryStuffings: { none: {} } } : {}),
        ...(awaitingSI === "true"
          ? { gateIns: { some: {} }, shippingInstruction: null }
          : {}),
      },
      include: {
        customer: true,
        invoice: true,
        ...(awaitingSI === "true" ? { factoryStuffings: true, gateIns: true } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: {
        customer: true,
        invoice: true,
        truckDispatches: { include: { transporter: true }, orderBy: { createdAt: "asc" } },
        factoryStuffings: { orderBy: { createdAt: "asc" } },
        gateIns: { orderBy: { createdAt: "asc" } },
        shippingInstruction: true,
        billOfLading: { include: { sob: true } },
        documents: { orderBy: { createdAt: "desc" } },
        comments: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        },
        timelineEvents: {
          include: { actor: { select: { name: true } } },
          orderBy: { occurredAt: "asc" },
        },
      },
    });
    if (!booking) throw new HttpError(404, "Booking not found");

    const auditLogs = await prisma.auditLog.findMany({
      where: { organizationId: req.user!.organizationId, entityId: booking.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    res.json({ ...booking, auditLogs });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;
    const user = req.user!;

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: user.organizationId },
    });
    if (!customer) throw new HttpError(404, "Customer not found");

    const bookingNumber = await generateNextBookingNumber(user.organizationId);

    const booking = await prisma.booking.create({
      data: {
        organizationId: user.organizationId,
        bookingNumber,
        customerId: data.customerId,
        exporterName: data.exporterName,
        buyerName: data.buyerName,
        pol: data.pol,
        pod: data.pod,
        shippingLine: data.shippingLine,
        vessel: data.vessel,
        etd: data.etd ? new Date(data.etd) : undefined,
        eta: data.eta ? new Date(data.eta) : undefined,
        freightTerms: data.freightTerms,
        commodity: data.commodity,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        createdById: user.id,
        timelineEvents: {
          create: {
            stage: "INVOICE",
            title: "Booking created",
            description: `Booking ${bookingNumber} created.`,
            actorId: user.id,
          },
        },
      },
    });

    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/tracking", async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      select: { id: true },
    });
    if (!booking) throw new HttpError(404, "Booking not found");
    const force = req.query.refresh === "1";
    const result = await fetchAndCacheTracking(req.params.id, { force });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cache = await (prisma as any).trackingCache.findUnique({
      where: { bookingId: req.params.id },
      select: { fetchedAt: true },
    });
    res.json({
      provider: result.provider,
      events: result.events,
      errorMessage: result.errorMessage,
      summary: result.summary,
      latestETA: result.latestETA,
      fetchedAt: cache?.fetchedAt ?? new Date(),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/comments", async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const { body } = req.body as { body?: string };
    if (typeof body !== "string" || body.trim().length === 0) {
      throw new HttpError(400, "Comment cannot be empty");
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, organizationId: req.user!.organizationId },
    });
    if (!booking) throw new HttpError(404, "Booking not found");

    const comment = await prisma.bookingComment.create({
      data: { bookingId, authorId: req.user!.id, body: body.trim() },
      include: { author: { select: { name: true } } },
    });

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

export default router;
