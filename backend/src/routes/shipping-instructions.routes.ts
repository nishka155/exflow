import { Router } from "express";
import multer from "multer";

import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { HttpError } from "../middleware/error-handler";
import { shippingInstructionSchema } from "../lib/validations/shipping-instruction";
import { uploadDocumentFile, getSignedDownloadUrl } from "../lib/storage/s3";
import { generateSiPdf } from "../lib/pdf/generate-si-pdf";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth, requireRole("shipping-instructions"));

router.get("/", async (req, res, next) => {
  try {
    const { awaitingBL } = req.query as { awaitingBL?: string };
    const shippingInstructions = await prisma.shippingInstruction.findMany({
      where: {
        organizationId: req.user!.organizationId,
        ...(awaitingBL === "true" ? { status: "CONFIRMED", billOfLading: null } : {}),
      },
      include: { booking: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(shippingInstructions);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const si = await prisma.shippingInstruction.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: {
        booking: { include: { customer: true } },
        billOfLading: true,
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!si) throw new HttpError(404, "Shipping instruction not found");
    res.json(si);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = shippingInstructionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;
    const user = req.user!;

    const booking = await prisma.booking.findFirst({
      where: { id: data.bookingId, organizationId: user.organizationId },
    });
    if (!booking) throw new HttpError(404, "Booking not found");

    const si = await prisma.shippingInstruction.create({
      data: {
        organizationId: user.organizationId,
        bookingId: data.bookingId,
        consignorName: data.consignorName,
        consignorAddress: data.consignorAddress,
        consigneeName: data.consigneeName,
        consigneeAddress: data.consigneeAddress,
        notifyPartyName: data.notifyPartyName,
        notifyPartyAddress: data.notifyPartyAddress,
        pol: data.pol,
        pod: data.pod,
        commodity: data.commodity,
        hsCode: data.hsCode,
        packageCount: data.packageCount,
        weight: data.weight,
        marks: data.marks,
        containerNumber: data.containerNumber,
        sealNumber: data.sealNumber,
        freightTerms: data.freightTerms,
        incoterms: data.incoterms,
        shippingLine: data.shippingLine,
        voyage: data.voyage,
        vessel: data.vessel,
        status: "DRAFT",
        createdById: user.id,
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { currentStage: "SHIPPING_INSTRUCTION" },
    });

    await prisma.bookingTimelineEvent.create({
      data: {
        bookingId: booking.id,
        stage: "SHIPPING_INSTRUCTION",
        title: "Shipping instruction created",
        actorId: user.id,
      },
    });

    res.status(201).json(si);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/send", async (req, res, next) => {
  try {
    const siId = req.params.id;
    const user = req.user!;
    const si = await prisma.shippingInstruction.findFirst({
      where: { id: siId, organizationId: user.organizationId },
    });
    if (!si) throw new HttpError(404, "Shipping instruction not found");
    if (si.status !== "DRAFT") throw new HttpError(409, "Only draft SIs can be sent");

    const [updated] = await prisma.$transaction([
      prisma.shippingInstruction.update({
        where: { id: siId },
        data: { status: "SENT", sentAt: new Date() },
      }),
      prisma.bookingTimelineEvent.create({
        data: {
          bookingId: si.bookingId,
          stage: "SHIPPING_INSTRUCTION",
          title: "Shipping instruction sent to line",
          description: si.shippingLine ? `Sent to ${si.shippingLine}` : undefined,
          actorId: user.id,
        },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/confirm", async (req, res, next) => {
  try {
    const siId = req.params.id;
    const si = await prisma.shippingInstruction.findFirst({
      where: { id: siId, organizationId: req.user!.organizationId },
    });
    if (!si) throw new HttpError(404, "Shipping instruction not found");
    if (si.status !== "SENT") throw new HttpError(409, "Only sent SIs can be confirmed");

    const updated = await prisma.shippingInstruction.update({
      where: { id: siId },
      data: { status: "CONFIRMED" },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/pdf", async (req, res, next) => {
  try {
    const si = await prisma.shippingInstruction.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!si) throw new HttpError(404, "Shipping instruction not found");
    await generateSiPdf(si.id, req.user!.organizationId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/pdf", async (req, res, next) => {
  try {
    const si = await prisma.shippingInstruction.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!si || !si.pdfUrl) throw new HttpError(404, "PDF not found");
    const url = await getSignedDownloadUrl(si.pdfUrl);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/documents", upload.single("file"), async (req, res, next) => {
  try {
    const siId = String(req.params.id);
    const si = await prisma.shippingInstruction.findFirst({
      where: { id: siId, organizationId: req.user!.organizationId },
    });
    if (!si) throw new HttpError(404, "Shipping instruction not found");

    const file = req.file;
    if (!file || file.size === 0) throw new HttpError(400, "No file selected");

    const path = await uploadDocumentFile(
      req.user!.organizationId,
      "si-attachment",
      file.originalname,
      file.buffer,
      file.mimetype
    );

    const document = await prisma.document.create({
      data: {
        organizationId: req.user!.organizationId,
        bookingId: si.bookingId,
        shippingInstructionId: siId,
        entityType: "SHIPPING_INSTRUCTION",
        category: "SHIPPING_INSTRUCTION",
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
