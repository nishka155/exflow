import { Router } from "express";
import multer from "multer";
import { DocumentCategory } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { HttpError } from "../middleware/error-handler";
import { stuffingSchema, stuffingUpdateSchema } from "../lib/validations/stuffing";
import { uploadDocumentFile, getSignedDownloadUrl } from "../lib/storage/s3";
import { generateStuffingReport } from "../lib/pdf/generate-stuffing-report";
import type { StuffingStatus } from "../lib/constants/statuses";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth, requireRole("stuffing"));

router.get("/", async (req, res, next) => {
  try {
    const { awaitingGateIn, bookingId } = req.query as {
      awaitingGateIn?: string;
      bookingId?: string;
    };
    const stuffings = await prisma.factoryStuffing.findMany({
      where: {
        organizationId: req.user!.organizationId,
        ...(awaitingGateIn === "true" ? { status: "COMPLETED", gateIn: null } : {}),
        ...(bookingId ? { bookingId } : {}),
      },
      include: { booking: { include: { customer: true } }, transporter: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(stuffings);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const stuffing = await prisma.factoryStuffing.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: {
        booking: { include: { customer: true, truckDispatches: true } },
        transporter: true,
        gateIn: true,
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!stuffing) throw new HttpError(404, "Stuffing record not found");
    res.json(stuffing);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = stuffingSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;
    const user = req.user!;

    const booking = await prisma.booking.findFirst({
      where: { id: data.bookingId, organizationId: user.organizationId },
    });
    if (!booking) throw new HttpError(404, "Booking not found");

    const stuffing = await prisma.factoryStuffing.create({
      data: {
        organizationId: user.organizationId,
        bookingId: data.bookingId,
        containerNumber: data.containerNumber || "TBD",
        containerSize: data.containerSize ?? "FT40",
        commodity: data.commodity || booking.commodity,
        sealNumber: data.sealNumber,
        contactPerson: data.contactPerson,
        contactNumber: data.contactNumber,
        transporterId: data.transporterId,
        pol: data.pol || booking.pol || "",
        pod: data.pod || booking.pod || "",
        numberOfBoxes: data.numberOfBoxes,
        numberOfBlocks: data.numberOfBlocks,
        grossWeight: data.grossWeight,
        netWeight: data.netWeight,
        lrGrNumber: data.lrGrNumber,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : booking.deliveryDate,
        status: "SCHEDULED",
        createdById: user.id,
      },
    });

    if (booking.currentStage === "INVOICE" || booking.currentStage === "DISPATCH") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { currentStage: "STUFFING" },
      });
    }

    await prisma.bookingTimelineEvent.create({
      data: {
        bookingId: booking.id,
        stage: "STUFFING",
        title: "Factory stuffing scheduled",
        description: `Container ${stuffing.containerNumber} scheduled for stuffing.`,
        actorId: user.id,
      },
    });

    res.status(201).json(stuffing);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const stuffingId = String(req.params.id);
    const parsed = stuffingUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;

    const stuffing = await prisma.factoryStuffing.findFirst({
      where: { id: stuffingId, organizationId: req.user!.organizationId },
    });
    if (!stuffing) throw new HttpError(404, "Stuffing record not found");

    const updated = await prisma.factoryStuffing.update({
      where: { id: stuffingId },
      data: {
        ...(data.containerNumber !== undefined && { containerNumber: data.containerNumber }),
        ...(data.containerSize !== undefined && { containerSize: data.containerSize }),
        ...(data.commodity !== undefined && { commodity: data.commodity }),
        ...(data.sealNumber !== undefined && { sealNumber: data.sealNumber }),
        ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson }),
        ...(data.contactNumber !== undefined && { contactNumber: data.contactNumber }),
        ...(data.transporterId !== undefined && { transporterId: data.transporterId || null }),
        ...(data.pol !== undefined && { pol: data.pol }),
        ...(data.pod !== undefined && { pod: data.pod }),
        ...(data.numberOfBoxes !== undefined && { numberOfBoxes: data.numberOfBoxes }),
        ...(data.numberOfBlocks !== undefined && { numberOfBlocks: data.numberOfBlocks }),
        ...(data.grossWeight !== undefined && { grossWeight: data.grossWeight }),
        ...(data.netWeight !== undefined && { netWeight: data.netWeight }),
        ...(data.lrGrNumber !== undefined && { lrGrNumber: data.lrGrNumber }),
        ...(data.deliveryDate !== undefined && {
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        }),
        ...(data.remarks !== undefined && { remarks: data.remarks }),
        ...(data.stuffingStartTime !== undefined && {
          stuffingStartTime: data.stuffingStartTime ? new Date(data.stuffingStartTime) : null,
        }),
        ...(data.stuffingEndTime !== undefined && {
          stuffingEndTime: data.stuffingEndTime ? new Date(data.stuffingEndTime) : null,
        }),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const stuffing = await prisma.factoryStuffing.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: { gateIn: true },
    });
    if (!stuffing) throw new HttpError(404, "Stuffing record not found");
    if (stuffing.gateIn) {
      throw new HttpError(409, "This container already has a gate-in record and cannot be deleted");
    }
    await prisma.factoryStuffing.delete({ where: { id: stuffing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.put("/:id/checklist", async (req, res, next) => {
  try {
    const stuffingId = req.params.id;
    const stuffing = await prisma.factoryStuffing.findFirst({
      where: { id: stuffingId, organizationId: req.user!.organizationId },
    });
    if (!stuffing) throw new HttpError(404, "Stuffing record not found");

    const body = req.body as {
      checklistContainerClean?: boolean;
      checklistContainerDamage?: boolean;
      checklistSealApplied?: boolean;
      checklistDocumentsUploaded?: boolean;
    };

    const updated = await prisma.factoryStuffing.update({
      where: { id: stuffingId },
      data: {
        checklistContainerClean: !!body.checklistContainerClean,
        checklistContainerDamage: !!body.checklistContainerDamage,
        checklistSealApplied: !!body.checklistSealApplied,
        checklistDocumentsUploaded: !!body.checklistDocumentsUploaded,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const STATUS_TRANSITIONS: Record<StuffingStatus, StuffingStatus[]> = {
  SCHEDULED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
};

router.post("/:id/status", async (req, res, next) => {
  try {
    const stuffingId = req.params.id;
    const { status: nextStatus } = req.body as { status?: StuffingStatus };
    const user = req.user!;

    const stuffing = await prisma.factoryStuffing.findFirst({
      where: { id: stuffingId, organizationId: user.organizationId },
    });
    if (!stuffing) throw new HttpError(404, "Stuffing record not found");

    const allowed = STATUS_TRANSITIONS[stuffing.status as StuffingStatus] ?? [];
    if (!nextStatus || !allowed.includes(nextStatus)) {
      throw new HttpError(409, `Cannot move stuffing from ${stuffing.status} to ${nextStatus}`);
    }

    const [updated] = await prisma.$transaction([
      prisma.factoryStuffing.update({
        where: { id: stuffingId },
        data: {
          status: nextStatus,
          stuffingStartTime:
            nextStatus === "IN_PROGRESS" ? new Date() : stuffing.stuffingStartTime,
          stuffingEndTime: nextStatus === "COMPLETED" ? new Date() : stuffing.stuffingEndTime,
        },
      }),
      prisma.bookingTimelineEvent.create({
        data: {
          bookingId: stuffing.bookingId,
          stage: "STUFFING",
          title:
            nextStatus === "IN_PROGRESS" ? "Factory stuffing started" : "Factory stuffing completed",
          description: `Container ${stuffing.containerNumber}`,
          actorId: user.id,
        },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/deliver", async (req, res, next) => {
  try {
    const stuffingId = req.params.id;
    const user = req.user!;

    const stuffing = await prisma.factoryStuffing.findFirst({
      where: { id: stuffingId, organizationId: user.organizationId },
    });
    if (!stuffing) throw new HttpError(404, "Stuffing record not found");
    if (stuffing.actualArrival) throw new HttpError(409, "Container already marked delivered");

    const [updated] = await prisma.$transaction([
      prisma.factoryStuffing.update({
        where: { id: stuffingId },
        data: { actualArrival: new Date() },
      }),
      prisma.bookingTimelineEvent.create({
        data: {
          bookingId: stuffing.bookingId,
          stage: "COMPLETED",
          title: "Container delivered",
          description: `Container ${stuffing.containerNumber} marked delivered.`,
          actorId: user.id,
        },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/report", async (req, res, next) => {
  try {
    const stuffing = await prisma.factoryStuffing.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!stuffing) throw new HttpError(404, "Stuffing record not found");
    await generateStuffingReport(stuffing.id, req.user!.organizationId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/report", async (req, res, next) => {
  try {
    const stuffing = await prisma.factoryStuffing.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!stuffing || !stuffing.reportUrl) throw new HttpError(404, "Report not found");
    const url = await getSignedDownloadUrl(stuffing.reportUrl);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/documents", upload.single("file"), async (req, res, next) => {
  try {
    const stuffingId = String(req.params.id);
    const stuffing = await prisma.factoryStuffing.findFirst({
      where: { id: stuffingId, organizationId: req.user!.organizationId },
    });
    if (!stuffing) throw new HttpError(404, "Stuffing record not found");

    const file = req.file;
    if (!file || file.size === 0) throw new HttpError(400, "No file selected");

    const path = await uploadDocumentFile(
      req.user!.organizationId,
      "stuffing-attachment",
      file.originalname,
      file.buffer,
      file.mimetype
    );

    const categoryHint = req.body?.category;
    const category =
      typeof categoryHint === "string" && categoryHint in DocumentCategory
        ? (categoryHint as DocumentCategory)
        : DocumentCategory.PHOTO;

    const document = await prisma.document.create({
      data: {
        organizationId: req.user!.organizationId,
        bookingId: stuffing.bookingId,
        factoryStuffingId: stuffingId,
        entityType: "STUFFING",
        category,
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
