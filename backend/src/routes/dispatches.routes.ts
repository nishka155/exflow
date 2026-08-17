import { Router } from "express";
import multer from "multer";

import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { HttpError } from "../middleware/error-handler";
import { dispatchSchema } from "../lib/validations/dispatch";
import { uploadDocumentFile } from "../lib/storage/s3";
import { notifyRoles } from "../lib/notifications";
import type { DispatchStatus } from "../lib/constants/statuses";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth, requireRole("dispatches"));

router.get("/", async (req, res, next) => {
  try {
    const dispatches = await prisma.truckDispatch.findMany({
      where: { organizationId: req.user!.organizationId },
      include: { booking: { include: { customer: true } }, transporter: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(dispatches);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const dispatch = await prisma.truckDispatch.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: {
        booking: { include: { customer: true } },
        transporter: true,
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!dispatch) throw new HttpError(404, "Dispatch not found");
    res.json(dispatch);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = dispatchSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;
    const user = req.user!;

    const booking = await prisma.booking.findFirst({
      where: { id: data.bookingId, organizationId: user.organizationId },
    });
    if (!booking) throw new HttpError(404, "Booking not found");

    const dispatch = await prisma.truckDispatch.create({
      data: {
        organizationId: user.organizationId,
        bookingId: data.bookingId,
        truckNumber: data.truckNumber,
        driverName: data.driverName,
        driverMobile: data.driverMobile,
        transporterId: data.transporterId,
        material: data.material,
        referenceNumber: data.referenceNumber,
        lrNumber: data.lrNumber,
        numberOfWeights: data.numberOfWeights,
        numberOfBlocks: data.numberOfBlocks,
        dispatchDate: new Date(data.dispatchDate),
        expectedFactoryArrival: new Date(data.expectedFactoryArrival),
        status: "PENDING",
        createdById: user.id,
      },
    });

    if (booking.currentStage === "INVOICE") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { currentStage: "DISPATCH" },
      });
    }

    await prisma.bookingTimelineEvent.create({
      data: {
        bookingId: booking.id,
        stage: "DISPATCH",
        title: "Truck dispatch created",
        description: `${data.truckNumber} scheduled for dispatch.`,
        actorId: user.id,
      },
    });

    res.status(201).json(dispatch);
  } catch (err) {
    next(err);
  }
});

const STATUS_TRANSITIONS: Record<DispatchStatus, DispatchStatus[]> = {
  PENDING: ["DISPATCHED", "DELAY"],
  DISPATCHED: ["REACHED_FACTORY", "DELAY"],
  DELAY: ["DISPATCHED", "REACHED_FACTORY"],
  REACHED_FACTORY: [],
};

router.post("/:id/status", async (req, res, next) => {
  try {
    const dispatchId = req.params.id;
    const { status: nextStatus } = req.body as { status?: DispatchStatus };
    const user = req.user!;

    const dispatch = await prisma.truckDispatch.findFirst({
      where: { id: dispatchId, organizationId: user.organizationId },
    });
    if (!dispatch) throw new HttpError(404, "Dispatch not found");

    const allowed = STATUS_TRANSITIONS[dispatch.status as DispatchStatus] ?? [];
    if (!nextStatus || !allowed.includes(nextStatus)) {
      throw new HttpError(409, `Cannot move dispatch from ${dispatch.status} to ${nextStatus}`);
    }

    const [updated] = await prisma.$transaction([
      prisma.truckDispatch.update({
        where: { id: dispatchId },
        data: {
          status: nextStatus,
          actualFactoryArrival: nextStatus === "REACHED_FACTORY" ? new Date() : undefined,
        },
      }),
      prisma.bookingTimelineEvent.create({
        data: {
          bookingId: dispatch.bookingId,
          stage: "DISPATCH",
          title:
            nextStatus === "REACHED_FACTORY"
              ? "Truck reached factory"
              : nextStatus === "DELAY"
                ? "Truck delayed"
                : "Truck dispatched",
          actorId: user.id,
        },
      }),
    ]);

    if (nextStatus === "DELAY") {
      await notifyRoles(user.organizationId, ["ADMIN", "EXPORT_MANAGER", "TRANSPORT_COORDINATOR"], {
        type: "TRUCK_DELAY",
        title: `Truck ${dispatch.truckNumber} delayed`,
        body: `Dispatch for booking is running behind schedule.`,
        entityType: "DISPATCH",
        entityId: dispatchId,
      });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/documents", upload.single("file"), async (req, res, next) => {
  try {
    const dispatchId = String(req.params.id);
    const dispatch = await prisma.truckDispatch.findFirst({
      where: { id: dispatchId, organizationId: req.user!.organizationId },
    });
    if (!dispatch) throw new HttpError(404, "Dispatch not found");

    const file = req.file;
    if (!file || file.size === 0) throw new HttpError(400, "No file selected");

    const path = await uploadDocumentFile(
      req.user!.organizationId,
      "dispatch-attachment",
      file.originalname,
      file.buffer,
      file.mimetype
    );

    const document = await prisma.document.create({
      data: {
        organizationId: req.user!.organizationId,
        bookingId: dispatch.bookingId,
        truckDispatchId: dispatchId,
        entityType: "DISPATCH",
        category: "OTHER",
        fileName: file.originalname,
        fileUrl: path,
        fileType: file.mimetype,
        fileSizeBytes: file.size,
        uploadedById: req.user!.id,
      },
    });

    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
});

export default router;
