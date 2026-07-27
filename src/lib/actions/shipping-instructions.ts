"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { uploadDocumentFile } from "@/lib/supabase/storage";
import { generateSiPdf } from "@/lib/pdf/generate-si-pdf";
import { shippingInstructionSchema } from "@/lib/validations/shipping-instruction";

export interface ActionResult {
  error?: string;
}

function parseSiForm(formData: FormData) {
  return shippingInstructionSchema.safeParse({
    shipmentId: formData.get("shipmentId"),
    consignorName: formData.get("consignorName"),
    consignorAddress: formData.get("consignorAddress") || undefined,
    consigneeName: formData.get("consigneeName"),
    consigneeAddress: formData.get("consigneeAddress") || undefined,
    notifyPartyName: formData.get("notifyPartyName") || undefined,
    notifyPartyAddress: formData.get("notifyPartyAddress") || undefined,
    pol: formData.get("pol"),
    pod: formData.get("pod"),
    commodity: formData.get("commodity"),
    hsCode: formData.get("hsCode") || undefined,
    packageCount: formData.get("packageCount") || undefined,
    weight: formData.get("weight") || undefined,
    marks: formData.get("marks") || undefined,
    containerNumber: formData.get("containerNumber") || undefined,
    sealNumber: formData.get("sealNumber") || undefined,
    freightTerms: formData.get("freightTerms") || undefined,
    incoterms: formData.get("incoterms") || undefined,
    shippingLine: formData.get("shippingLine") || undefined,
    voyage: formData.get("voyage") || undefined,
    vessel: formData.get("vessel") || undefined,
  });
}

export async function createShippingInstructionAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser("shipping-instructions");
  const parsed = parseSiForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const shipment = await prisma.shipment.findFirst({
    where: { id: data.shipmentId, organizationId: user.organizationId },
  });
  if (!shipment) return { error: "Shipment not found" };

  const si = await prisma.shippingInstruction.create({
    data: {
      organizationId: user.organizationId,
      shipmentId: data.shipmentId,
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

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: { currentStage: "SHIPPING_INSTRUCTION" },
  });

  await prisma.shipmentTimelineEvent.create({
    data: {
      shipmentId: shipment.id,
      stage: "SHIPPING_INSTRUCTION",
      title: "Shipping instruction created",
      actorId: user.id,
    },
  });

  revalidatePath("/shipping-instructions");
  redirect(`/shipping-instructions/${si.id}`);
}

export async function sendShippingInstructionAction(siId: string) {
  const user = await requireUser("shipping-instructions");
  const si = await prisma.shippingInstruction.findFirst({
    where: { id: siId, organizationId: user.organizationId },
  });
  if (!si) throw new Error("Shipping instruction not found");
  if (si.status !== "DRAFT") throw new Error("Only draft SIs can be sent");

  await prisma.$transaction([
    prisma.shippingInstruction.update({
      where: { id: siId },
      data: { status: "SENT", sentAt: new Date() },
    }),
    prisma.shipmentTimelineEvent.create({
      data: {
        shipmentId: si.shipmentId,
        stage: "SHIPPING_INSTRUCTION",
        title: "Shipping instruction sent to line",
        description: si.shippingLine ? `Sent to ${si.shippingLine}` : undefined,
        actorId: user.id,
      },
    }),
  ]);

  revalidatePath(`/shipping-instructions/${siId}`);
  revalidatePath("/shipping-instructions");
}

export async function confirmShippingInstructionAction(siId: string) {
  const user = await requireUser("shipping-instructions");
  const si = await prisma.shippingInstruction.findFirst({
    where: { id: siId, organizationId: user.organizationId },
  });
  if (!si) throw new Error("Shipping instruction not found");
  if (si.status !== "SENT") throw new Error("Only sent SIs can be confirmed");

  await prisma.shippingInstruction.update({
    where: { id: siId },
    data: { status: "CONFIRMED" },
  });

  revalidatePath(`/shipping-instructions/${siId}`);
  revalidatePath("/shipping-instructions");
}

export async function generateSiPdfAction(siId: string) {
  const user = await requireUser("shipping-instructions");
  await generateSiPdf(siId, user.organizationId);
  revalidatePath(`/shipping-instructions/${siId}`);
}

export async function uploadSiDocumentAction(siId: string, formData: FormData) {
  const user = await requireUser("shipping-instructions");
  const si = await prisma.shippingInstruction.findFirst({
    where: { id: siId, organizationId: user.organizationId },
  });
  if (!si) throw new Error("Shipping instruction not found");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No file selected");

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await uploadDocumentFile(user.organizationId, "si-attachment", file.name, buffer, file.type);

  await prisma.document.create({
    data: {
      organizationId: user.organizationId,
      shipmentId: si.shipmentId,
      shippingInstructionId: siId,
      entityType: "SHIPPING_INSTRUCTION",
      category: "SHIPPING_INSTRUCTION",
      fileName: file.name,
      fileUrl: path,
      fileType: file.type,
      fileSizeBytes: file.size,
      uploadedById: user.id,
    },
  });

  revalidatePath(`/shipping-instructions/${siId}`);
}
