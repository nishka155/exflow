import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { HttpError } from "../middleware/error-handler";

const router = Router();

router.use(requireAuth, requireRole("bills-of-lading"));

router.get("/", async (req, res, next) => {
  try {
    const sobs = await prisma.shippedOnBoard.findMany({
      where: { organizationId: req.user!.organizationId },
      include: { booking: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(sobs);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const sob = await prisma.shippedOnBoard.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: { booking: { include: { customer: true } }, billOfLading: true },
    });
    if (!sob) throw new HttpError(404, "SOB record not found");
    res.json(sob);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/complete", async (req, res, next) => {
  try {
    const sobId = req.params.id;
    const { vessel, shippingLine, sobDate, remarks } = req.body as {
      vessel?: string;
      shippingLine?: string;
      sobDate?: string;
      remarks?: string;
    };
    const user = req.user!;

    const sob = await prisma.shippedOnBoard.findFirst({
      where: { id: sobId, organizationId: user.organizationId },
    });
    if (!sob) throw new HttpError(404, "SOB record not found");
    if (sob.status === "COMPLETED") throw new HttpError(409, "SOB already marked complete");

    const [updated] = await prisma.$transaction([
      prisma.shippedOnBoard.update({
        where: { id: sobId },
        data: {
          status: "COMPLETED",
          vessel: vessel ?? sob.vessel,
          shippingLine: shippingLine ?? sob.shippingLine,
          sobDate: sobDate ? new Date(sobDate) : (sob.sobDate ?? new Date()),
          remarks: remarks ?? sob.remarks,
        },
      }),
      prisma.booking.update({
        where: { id: sob.bookingId },
        data: { currentStage: "COMPLETED" },
      }),
      prisma.bookingTimelineEvent.create({
        data: {
          bookingId: sob.bookingId,
          stage: "COMPLETED",
          title: "Shipped on board",
          description: vessel ? `Vessel: ${vessel}` : undefined,
          actorId: user.id,
        },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
