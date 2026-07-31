"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { generateNextShipmentNumber } from "@/lib/queries/shipments";
import { generateInvoicePdf } from "@/lib/pdf/generate-invoice-pdf";
import { uploadDocumentFile } from "@/lib/storage/s3";
import { invoiceSchema, computeInvoiceTotals } from "@/lib/validations/invoice";
import type { InvoiceStatus } from "@/lib/constants/statuses";

export interface ActionResult {
  error?: string;
}

function parseInvoiceForm(formData: FormData) {
  return invoiceSchema.safeParse({
    invoiceNumber: formData.get("invoiceNumber"),
    invoiceDate: formData.get("invoiceDate"),
    customerId: formData.get("customerId"),
    buyerName: formData.get("buyerName"),
    buyerAddress: formData.get("buyerAddress") || undefined,
    poNumber: formData.get("poNumber") || undefined,
    material: formData.get("material"),
    quantity: formData.get("quantity"),
    quantityUnit: formData.get("quantityUnit") || "MT",
    weight: formData.get("weight"),
    weightUnit: formData.get("weightUnit") || "KG",
    numberOfBlocks: formData.get("numberOfBlocks") || undefined,
    hsnCode: formData.get("hsnCode"),
    unitPrice: formData.get("unitPrice"),
    currency: formData.get("currency") || "USD",
    gstPercent: formData.get("gstPercent") || 0,
    exportCountry: formData.get("exportCountry"),
  });
}

export async function createInvoiceAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser("invoices");
  const parsed = parseInvoiceForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const { gstAmount, totalAmount } = computeInvoiceTotals(data);

  const existing = await prisma.invoice.findFirst({
    where: { organizationId: user.organizationId, invoiceNumber: data.invoiceNumber },
  });
  if (existing) {
    return { error: `Invoice number ${data.invoiceNumber} already exists` };
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

  revalidatePath("/invoices");
  redirect(`/invoices/${shipment.invoice!.id}`);
}

export async function updateInvoiceAction(
  invoiceId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser("invoices");
  const parsed = parseInvoiceForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const { gstAmount, totalAmount } = computeInvoiceTotals(data);

  const current = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: user.organizationId },
    include: { versions: { select: { versionNumber: true }, orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!current) return { error: "Invoice not found" };
  if (current.status === "COMPLETED") {
    return { error: "Completed invoices cannot be edited" };
  }

  const nextVersion = (current.versions[0]?.versionNumber ?? 0) + 1;

  await prisma.$transaction([
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

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

const STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["APPROVED"],
  APPROVED: ["COMPLETED", "DRAFT"],
  COMPLETED: [],
};

export async function setInvoiceStatusAction(invoiceId: string, nextStatus: InvoiceStatus) {
  const user = await requireUser("invoices");
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: user.organizationId },
  });
  if (!invoice) throw new Error("Invoice not found");

  const allowed = STATUS_TRANSITIONS[invoice.status as InvoiceStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Cannot move invoice from ${invoice.status} to ${nextStatus}`);
  }

  await prisma.$transaction([
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

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function generateInvoicePdfAction(invoiceId: string) {
  const user = await requireUser("invoices");
  await generateInvoicePdf(invoiceId, user.organizationId);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function deleteInvoiceAction(invoiceId: string) {
  const user = await requireUser("invoices");
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: user.organizationId },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") {
    throw new Error("Only draft invoices can be deleted");
  }
  await prisma.shipment.delete({ where: { id: invoice.shipmentId } });
  revalidatePath("/invoices");
  redirect("/invoices");
}

export async function uploadInvoiceDocumentAction(invoiceId: string, formData: FormData) {
  const user = await requireUser("invoices");
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: user.organizationId },
  });
  if (!invoice) throw new Error("Invoice not found");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No file selected");

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await uploadDocumentFile(user.organizationId, "invoice-attachment", file.name, buffer, file.type);

  await prisma.document.create({
    data: {
      organizationId: user.organizationId,
      shipmentId: invoice.shipmentId,
      invoiceId,
      entityType: "INVOICE",
      category: "OTHER",
      fileName: file.name,
      fileUrl: path,
      fileType: file.type,
      fileSizeBytes: file.size,
      uploadedById: user.id,
    },
  });

  revalidatePath(`/invoices/${invoiceId}`);
}
