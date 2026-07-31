import { Router } from "express";
import multer from "multer";

import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { HttpError } from "../middleware/error-handler";
import { invoiceSchema, computeInvoiceTotals } from "../lib/validations/invoice";
import { uploadDocumentFile, getSignedDownloadUrl } from "../lib/storage/s3";
import { generateInvoicePdf } from "../lib/pdf/generate-invoice-pdf";
import { findPossibleDuplicateInvoices } from "../lib/ai/duplicate-detection";
import type { InvoiceStatus } from "../lib/constants/statuses";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth, requireRole("invoices"));

// Mirrors src/lib/queries/shipments.ts#generateNextShipmentNumber, but
// collision-safe: shipmentNumber is a globally-unique column while the count
// used to build it is scoped per-org, so once more than one org exists the
// naive count-based candidate can already be taken by another org's shipment.
async function generateNextShipmentNumber(organizationId: string) {
  const year = new Date().getFullYear();
  let count = await prisma.shipment.count({ where: { organizationId } });
  let candidate = `EXF-${year}-${String(count + 1).padStart(6, "0")}`;
  while (await prisma.shipment.findUnique({ where: { shipmentNumber: candidate } })) {
    count += 1;
    candidate = `EXF-${year}-${String(count + 1).padStart(6, "0")}`;
  }
  return candidate;
}

router.get("/", async (req, res, next) => {
  try {
    const { status, search } = req.query as { status?: string; search?: string };
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: req.user!.organizationId,
        ...(status ? { status: status as InvoiceStatus } : {}),
        ...(search
          ? {
              OR: [
                { invoiceNumber: { contains: search, mode: "insensitive" } },
                { buyerName: { contains: search, mode: "insensitive" } },
                { material: { contains: search, mode: "insensitive" } },
                { poNumber: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { customer: true, shipment: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: {
        customer: true,
        shipment: true,
        createdBy: { select: { name: true } },
        versions: { orderBy: { versionNumber: "desc" } },
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found");

    const duplicates = await findPossibleDuplicateInvoices(invoice.id);
    res.json({ ...invoice, duplicates });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = invoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;
    const { gstAmount, totalAmount } = computeInvoiceTotals(data);
    const user = req.user!;

    const existing = await prisma.invoice.findFirst({
      where: { organizationId: user.organizationId, invoiceNumber: data.invoiceNumber },
    });
    if (existing) {
      throw new HttpError(409, `Invoice number ${data.invoiceNumber} already exists`);
    }

    const shipmentNumber = await generateNextShipmentNumber(user.organizationId);

    const shipment = await prisma.shipment.create({
      data: {
        organizationId: user.organizationId,
        shipmentNumber,
        customerId: data.customerId,
        currentStage: "INVOICE",
        createdById: user.id,
        invoice: {
          create: {
            organizationId: user.organizationId,
            invoiceNumber: data.invoiceNumber,
            invoiceDate: new Date(data.invoiceDate),
            customerId: data.customerId,
            buyerName: data.buyerName,
            buyerAddress: data.buyerAddress,
            poNumber: data.poNumber,
            material: data.material,
            quantity: data.quantity,
            quantityUnit: data.quantityUnit,
            weight: data.weight,
            weightUnit: data.weightUnit,
            numberOfBlocks: data.numberOfBlocks,
            hsnCode: data.hsnCode,
            unitPrice: data.unitPrice,
            currency: data.currency,
            gstPercent: data.gstPercent,
            gstAmount,
            totalAmount,
            exportCountry: data.exportCountry,
            status: "DRAFT",
            createdById: user.id,
          },
        },
        timelineEvents: {
          create: {
            stage: "INVOICE",
            title: "Invoice created",
            description: `Draft invoice ${data.invoiceNumber} created.`,
            actorId: user.id,
          },
        },
      },
      include: { invoice: true },
    });

    res.status(201).json(shipment.invoice);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    const parsed = invoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;
    const { gstAmount, totalAmount } = computeInvoiceTotals(data);
    const user = req.user!;

    const current = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: user.organizationId },
      include: {
        versions: { select: { versionNumber: true }, orderBy: { versionNumber: "desc" }, take: 1 },
      },
    });
    if (!current) throw new HttpError(404, "Invoice not found");
    if (current.status === "COMPLETED") {
      throw new HttpError(409, "Completed invoices cannot be edited");
    }

    const nextVersion = (current.versions[0]?.versionNumber ?? 0) + 1;

    const [, updated] = await prisma.$transaction([
      prisma.invoiceVersion.create({
        data: {
          invoiceId,
          versionNumber: nextVersion,
          snapshot: JSON.parse(JSON.stringify(current)),
          changedById: user.id,
          changeNote: "Updated invoice details",
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          invoiceNumber: data.invoiceNumber,
          invoiceDate: new Date(data.invoiceDate),
          customerId: data.customerId,
          buyerName: data.buyerName,
          buyerAddress: data.buyerAddress,
          poNumber: data.poNumber,
          material: data.material,
          quantity: data.quantity,
          quantityUnit: data.quantityUnit,
          weight: data.weight,
          weightUnit: data.weightUnit,
          numberOfBlocks: data.numberOfBlocks,
          hsnCode: data.hsnCode,
          unitPrice: data.unitPrice,
          currency: data.currency,
          gstPercent: data.gstPercent,
          gstAmount,
          totalAmount,
          exportCountry: data.exportCountry,
        },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["APPROVED"],
  APPROVED: ["COMPLETED", "DRAFT"],
  COMPLETED: [],
};

router.post("/:id/status", async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    const { status: nextStatus } = req.body as { status?: InvoiceStatus };
    const user = req.user!;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: user.organizationId },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found");

    const allowed = STATUS_TRANSITIONS[invoice.status as InvoiceStatus] ?? [];
    if (!nextStatus || !allowed.includes(nextStatus)) {
      throw new HttpError(409, `Cannot move invoice from ${invoice.status} to ${nextStatus}`);
    }

    const [updated] = await prisma.$transaction([
      prisma.invoice.update({ where: { id: invoiceId }, data: { status: nextStatus } }),
      prisma.shipmentTimelineEvent.create({
        data: {
          shipmentId: invoice.shipmentId,
          stage: "INVOICE",
          title: `Invoice ${nextStatus.toLowerCase()}`,
          actorId: user.id,
        },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found");
    if (invoice.status !== "DRAFT") {
      throw new HttpError(409, "Only draft invoices can be deleted");
    }
    await prisma.shipment.delete({ where: { id: invoice.shipmentId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post("/:id/pdf", async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found");
    await generateInvoicePdf(invoice.id, req.user!.organizationId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/pdf", async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!invoice || !invoice.pdfUrl) throw new HttpError(404, "PDF not found");
    const url = await getSignedDownloadUrl(invoice.pdfUrl);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/documents", upload.single("file"), async (req, res, next) => {
  try {
    const invoiceId = String(req.params.id);
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: req.user!.organizationId },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found");

    const file = req.file;
    if (!file || file.size === 0) throw new HttpError(400, "No file selected");

    const path = await uploadDocumentFile(
      req.user!.organizationId,
      "invoice-attachment",
      file.originalname,
      file.buffer,
      file.mimetype
    );

    const document = await prisma.document.create({
      data: {
        organizationId: req.user!.organizationId,
        shipmentId: invoice.shipmentId,
        invoiceId: invoice.id,
        entityType: "INVOICE",
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

router.get("/:id/documents/:documentId/download", async (req, res, next) => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.documentId,
        invoiceId: req.params.id,
        organizationId: req.user!.organizationId,
      },
    });
    if (!document) throw new HttpError(404, "Document not found");
    const url = await getSignedDownloadUrl(document.fileUrl);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

export default router;
