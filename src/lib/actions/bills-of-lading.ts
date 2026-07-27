"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { uploadDocumentFile } from "@/lib/supabase/storage";
import { generateBlPdf } from "@/lib/pdf/generate-bl-pdf";
import { billOfLadingSchema, BL_COMPARE_FIELDS } from "@/lib/validations/bill-of-lading";
import { Prisma } from "@prisma/client";

export interface ActionResult {
  error?: string;
}

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

export async function createBillOfLadingAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser("bills-of-lading");
  const siId = formData.get("shippingInstructionId");
  if (typeof siId !== "string" || !siId) {
    return { error: "Shipping instruction is required" };
  }

  const si = await prisma.shippingInstruction.findFirst({
    where: { id: siId, organizationId: user.organizationId },
  });
  if (!si) return { error: "Shipping instruction not found" };

  const bl = await prisma.billOfLading.create({
    data: {
      organizationId: user.organizationId,
      shipmentId: si.shipmentId,
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

  await prisma.shipmentTimelineEvent.create({
    data: {
      shipmentId: si.shipmentId,
      stage: "BILL_OF_LADING",
      title: "Bill of Lading draft created",
      actorId: user.id,
    },
  });

  revalidatePath("/bills-of-lading");
  redirect(`/bills-of-lading/${bl.id}`);
}

export async function updateBillOfLadingAction(
  blId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser("bills-of-lading");
  const parsed = billOfLadingSchema.safeParse({
    blNumber: formData.get("blNumber") || undefined,
    blDate: formData.get("blDate") || undefined,
    consignorName: formData.get("consignorName"),
    consignorAddress: formData.get("consignorAddress") || undefined,
    consigneeName: formData.get("consigneeName"),
    consigneeAddress: formData.get("consigneeAddress") || undefined,
    notifyPartyName: formData.get("notifyPartyName") || undefined,
    notifyPartyAddress: formData.get("notifyPartyAddress") || undefined,
    pol: formData.get("pol"),
    pod: formData.get("pod"),
    vessel: formData.get("vessel") || undefined,
    voyage: formData.get("voyage") || undefined,
    containerNumber: formData.get("containerNumber") || undefined,
    sealNumber: formData.get("sealNumber") || undefined,
    commodity: formData.get("commodity"),
    packageCount: formData.get("packageCount") || undefined,
    weight: formData.get("weight") || undefined,
    freightTerms: formData.get("freightTerms") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const current = await prisma.billOfLading.findFirst({
    where: { id: blId, organizationId: user.organizationId },
    include: {
      shippingInstruction: true,
      revisions: { select: { revisionNumber: true }, orderBy: { revisionNumber: "desc" }, take: 1 },
    },
  });
  if (!current) return { error: "Bill of Lading not found" };
  if (current.status === "FINAL") return { error: "Final bills of lading cannot be edited" };

  const mismatches = computeMismatches(data, current.shippingInstruction);
  const nextVersion = (current.revisions[0]?.revisionNumber ?? 0) + 1;

  await prisma.$transaction([
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

  revalidatePath(`/bills-of-lading/${blId}`);
  revalidatePath("/bills-of-lading");
  redirect(`/bills-of-lading/${blId}`);
}

export async function finalizeBillOfLadingAction(blId: string) {
  const user = await requireUser("bills-of-lading");
  const bl = await prisma.billOfLading.findFirst({
    where: { id: blId, organizationId: user.organizationId },
  });
  if (!bl) throw new Error("Bill of Lading not found");
  if (bl.status === "MISMATCH") {
    throw new Error("Resolve mismatches with the shipping instruction before finalizing");
  }

  await prisma.$transaction([
    prisma.billOfLading.update({ where: { id: blId }, data: { status: "FINAL" } }),
    prisma.shipment.update({ where: { id: bl.shipmentId }, data: { currentStage: "COMPLETED" } }),
    prisma.shipmentTimelineEvent.create({
      data: {
        shipmentId: bl.shipmentId,
        stage: "BILL_OF_LADING",
        title: "Final Bill of Lading issued",
        description: bl.blNumber ? `BL Number: ${bl.blNumber}` : undefined,
        actorId: user.id,
      },
    }),
  ]);

  revalidatePath(`/bills-of-lading/${blId}`);
  revalidatePath("/bills-of-lading");
}

export async function generateBlPdfAction(blId: string) {
  const user = await requireUser("bills-of-lading");
  await generateBlPdf(blId, user.organizationId);
  revalidatePath(`/bills-of-lading/${blId}`);
}

export async function uploadBlDocumentAction(blId: string, formData: FormData) {
  const user = await requireUser("bills-of-lading");
  const bl = await prisma.billOfLading.findFirst({
    where: { id: blId, organizationId: user.organizationId },
  });
  if (!bl) throw new Error("Bill of Lading not found");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No file selected");

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await uploadDocumentFile(user.organizationId, "bl-attachment", file.name, buffer, file.type);

  await prisma.document.create({
    data: {
      organizationId: user.organizationId,
      shipmentId: bl.shipmentId,
      billOfLadingId: blId,
      entityType: "BILL_OF_LADING",
      category: "BILL_OF_LADING",
      fileName: file.name,
      fileUrl: path,
      fileType: file.type,
      fileSizeBytes: file.size,
      uploadedById: user.id,
    },
  });

  revalidatePath(`/bills-of-lading/${blId}`);
}
