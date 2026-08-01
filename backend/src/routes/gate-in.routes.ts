import { Router } from "express";
import multer from "multer";

import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { HttpError } from "../middleware/error-handler";
import { gateInSchema } from "../lib/validations/gate-in";
import { uploadDocumentFile } from "../lib/storage/s3";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth, requireRole("gate-in"));

router.get("/", async (req, res, next) => {
  try {
    const gateIns = await prisma.gateIn.findMany({
      where: { organizationId: req.user!.organizationId },
      include: { booking: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(gateIns);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const gateIn = await prisma.gateIn.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: {
        booking: { include: { customer: true } },
        factoryStuffing: true,
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!gateIn) throw new HttpError(404, "Gate-in record not found");
    res.json(gateIn);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = gateInSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;
    const user = req.user!;

    const stuffing = await prisma.factoryStuffing.findFirst({
      where: { id: data.factoryStuffingId, organizationId: user.organizationId },
      include: { booking: true },
    });
    if (!stuffing) throw new HttpError(404, "Stuffing record not found");

    const gateIn = await prisma.gateIn.create({
      data: {
        organizationId: user.organizationId,
        bookingId: stuffing.bookingId,
        factoryStuffingId: stuffing.id,
        containerNumber: stuffing.containerNumber,
        gateInDate: new Date(data.gateInDate),
        terminal: data.terminal,
        yard: data.yard,
        vehicleNumber: data.vehicleNumber,
        form13Updated: data.form13Updated ?? false,
        gatePass: data.gatePass,
        eirNumber: data.eirNumber,
        remarks: data.remarks,
        status: "COMPLETED",
        createdById: user.id,
      },
    });

    if (["INVOICE", "DISPATCH", "STUFFING"].includes(stuffing.booking.currentStage)) {
      await prisma.booking.update({
        where: { id: stuffing.bookingId },
        data: { currentStage: "GATE_IN" },
      });
    }

    await prisma.bookingTimelineEvent.create({
      data: {
        bookingId: stuffing.bookingId,
        stage: "GATE_IN",
        title: "Container gated in",
        description: `${stuffing.containerNumber} gated in at ${data.terminal}.`,
        actorId: user.id,
      },
    });

    res.status(201).json(gateIn);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/documents", upload.single("file"), async (req, res, next) => {
  try {
    const gateInId = String(req.params.id);
    const gateIn = await prisma.gateIn.findFirst({
      where: { id: gateInId, organizationId: req.user!.organizationId },
    });
    if (!gateIn) throw new HttpError(404, "Gate-in record not found");

    const file = req.file;
    if (!file || file.size === 0) throw new HttpError(400, "No file selected");

    const path = await uploadDocumentFile(
      req.user!.organizationId,
      "gate-in-attachment",
      file.originalname,
      file.buffer,
      file.mimetype
    );

    const document = await prisma.document.create({
      data: {
        organizationId: req.user!.organizationId,
        bookingId: gateIn.bookingId,
        gateInId,
        entityType: "GATE_IN",
        category: "GATE_PASS",
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
