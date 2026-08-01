import { Router } from "express";
import multer from "multer";
import { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { HttpError } from "../middleware/error-handler";
import { billOfLadingSchema, BL_COMPARE_FIELDS } from "../lib/validations/bill-of-lading";
import { uploadDocumentFile, getSignedDownloadUrl } from "../lib/storage/s3";
import { generateBlPdf } from "../lib/pdf/generate-bl-pdf";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth, requireRole("bills-of-lading"));

type ComparableFields = Partial<
  Record<(typeof BL_COMPARE_FIELDS)[number][0], string | number | null | undefined>
>;

function computeMismatches(bl: ComparableFields, si: ComparableFields) {
  const mismatches: { field: string; label: string; blValue: string; siValue: string }[] = [];
  for (const [field, label] of BL_COMPARE_FIELDS) {
    const blValue = bl[field];
    const siValue = si[field];
    const blStr = blValue == null ? "" : String(blValue);
    const siStr = siValue == null ? "" : String(siValue);
    if (blStr !== siStr) {
      mismatches.push({ field, label, blValue: blStr || "—", siValue: siStr || "—" });
    }
  }
  return mismatches;
}

router.get("/", async (req, res, next) => {
  try {
    const billsOfLading = await prisma.billOfLading.findMany({
      where: { organizationId: req.user!.organizationId },
      include: { booking: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(billsOfLading);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const bl = await prisma.billOfLading.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: {
        booking: { include: { customer: true } },
        shippingInstruction: true,
        revisions: { orderBy: { revisionNumber: "desc" } },
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!bl) throw new HttpError(404, "Bill of Lading not found");
    res.json(bl);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { shippingInstructionId } = req.body as { shippingInstructionId?: string };
    if (!shippingInstructionId) throw new HttpError(400, "Shipping instruction is required");
    const user = req.user!;

    const si = await prisma.shippingInstruction.findFirst({
      where: { id: shippingInstructionId, organizationId: user.organizationId },
    });
    if (!si) throw new HttpError(404, "Shipping instruction not found");

    const bl = await prisma.billOfLading.create({
      data: {
        organizationId: user.organizationId,
        bookingId: si.bookingId,
        shippingInstructionId: si.id,
        consignorName: si.consignorName,
        consignorAddress: si.consignorAddress,
        consigneeName: si.consigneeName,
        consigneeAddress: si.consigneeAddress,
        notifyPartyName: si.notifyPartyName,
        notifyPartyAddress: si.notifyPartyAddress,
        pol: si.pol,
        pod: si.pod,
        vessel: si.vessel,
        voyage: si.voyage,
        containerNumber: si.containerNumber,
        sealNumber: si.sealNumber,
        commodity: si.commodity,
        packageCount: si.packageCount,
        weight: si.weight,
        freightTerms: si.freightTerms,
        status: "DRAFT",
        createdById: user.id,
      },
    });

    await prisma.bookingTimelineEvent.create({
      data: {
        bookingId: si.bookingId,
        stage: "BILL_OF_LADING",
        title: "Bill of Lading draft created",
        actorId: user.id,
      },
    });

    res.status(201).json(bl);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const blId = req.params.id;
    const parsed = billOfLadingSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;
    const user = req.user!;

    const current = await prisma.billOfLading.findFirst({
      where: { id: blId, organizationId: user.organizationId },
      include: {
        shippingInstruction: true,
        revisions: { select: { revisionNumber: true }, orderBy: { revisionNumber: "desc" }, take: 1 },
      },
    });
    if (!current) throw new HttpError(404, "Bill of Lading not found");
    if (current.status === "FINAL") throw new HttpError(409, "Final bills of lading cannot be edited");

    const mismatches = computeMismatches(data, current.shippingInstruction);
    const nextVersion = (current.revisions[0]?.revisionNumber ?? 0) + 1;

    const [, updated] = await prisma.$transaction([
      prisma.bLRevision.create({
        data: {
          billOfLadingId: blId,
          revisionNumber: nextVersion,
          snapshot: JSON.parse(JSON.stringify(current)),
          changedById: user.id,
          changeNote: "Updated bill of lading details",
        },
      }),
      prisma.billOfLading.update({
        where: { id: blId },
        data: {
          blNumber: data.blNumber,
          blDate: data.blDate ? new Date(data.blDate) : undefined,
          consignorName: data.consignorName,
          consignorAddress: data.consignorAddress,
          consigneeName: data.consigneeName,
          consigneeAddress: data.consigneeAddress,
          notifyPartyName: data.notifyPartyName,
          notifyPartyAddress: data.notifyPartyAddress,
          pol: data.pol,
          pod: data.pod,
          vessel: data.vessel,
          voyage: data.voyage,
          containerNumber: data.containerNumber,
          sealNumber: data.sealNumber,
          commodity: data.commodity,
          packageCount: data.packageCount,
          weight: data.weight,
          freightTerms: data.freightTerms,
          status: mismatches.length > 0 ? "MISMATCH" : "DRAFT",
          mismatchNotes: mismatches.length > 0 ? mismatches : Prisma.DbNull,
        },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/finalize", async (req, res, next) => {
  try {
    const blId = req.params.id;
    const user = req.user!;
    const bl = await prisma.billOfLading.findFirst({
      where: { id: blId, organizationId: user.organizationId },
    });
    if (!bl) throw new HttpError(404, "Bill of Lading not found");
    if (bl.status === "MISMATCH") {
      throw new HttpError(409, "Resolve mismatches with the shipping instruction before finalizing");
    }

    const [updated] = await prisma.$transaction([
      prisma.billOfLading.update({ where: { id: blId }, data: { status: "FINAL" } }),
      prisma.booking.update({ where: { id: bl.bookingId }, data: { currentStage: "SOB" } }),
      prisma.bookingTimelineEvent.create({
        data: {
          bookingId: bl.bookingId,
          stage: "BILL_OF_LADING",
          title: "Final Bill of Lading issued",
          description: bl.blNumber ? `BL Number: ${bl.blNumber}` : undefined,
          actorId: user.id,
        },
      }),
      prisma.shippedOnBoard.create({
        data: {
          organizationId: user.organizationId,
          bookingId: bl.bookingId,
          billOfLadingId: bl.id,
          vessel: bl.vessel,
          status: "PENDING",
          createdById: user.id,
        },
      }),
      prisma.bookingTimelineEvent.create({
        data: {
          bookingId: bl.bookingId,
          stage: "SOB",
          title: "Awaiting shipped-on-board confirmation",
          actorId: user.id,
        },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/pdf", async (req, res, next) => {
  try {
    const bl = await prisma.billOfLading.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!bl) throw new HttpError(404, "Bill of Lading not found");
    await generateBlPdf(bl.id, req.user!.organizationId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/pdf", async (req, res, next) => {
  try {
    const bl = await prisma.billOfLading.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!bl || !bl.pdfUrl) throw new HttpError(404, "PDF not found");
    const url = await getSignedDownloadUrl(bl.pdfUrl);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/documents", upload.single("file"), async (req, res, next) => {
  try {
    const blId = String(req.params.id);
    const bl = await prisma.billOfLading.findFirst({
      where: { id: blId, organizationId: req.user!.organizationId },
    });
    if (!bl) throw new HttpError(404, "Bill of Lading not found");

    const file = req.file;
    if (!file || file.size === 0) throw new HttpError(400, "No file selected");

    const path = await uploadDocumentFile(
      req.user!.organizationId,
      "bl-attachment",
      file.originalname,
      file.buffer,
      file.mimetype
    );

    const document = await prisma.document.create({
      data: {
        organizationId: req.user!.organizationId,
        bookingId: bl.bookingId,
        billOfLadingId: blId,
        entityType: "BILL_OF_LADING",
        category: "BILL_OF_LADING",
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
