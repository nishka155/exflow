"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { uploadDocumentFile } from "@/lib/storage/s3";
import { stuffingSchema } from "@/lib/validations/stuffing";
import type { StuffingStatus } from "@/lib/constants/statuses";
import { DocumentCategory } from "@prisma/client";
import { generateStuffingReport } from "@/lib/pdf/generate-stuffing-report";

export interface ActionResult {
  error?: string;
}

export async function createStuffingAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser("stuffing");
  const parsed = stuffingSchema.safeParse({
    shipmentId: formData.get("shipmentId"),
    containerNumber: formData.get("containerNumber"),
    containerSize: formData.get("containerSize"),
    sealNumber: formData.get("sealNumber") || undefined,
    contactNumber: formData.get("contactNumber") || undefined,
    transporterId: formData.get("transporterId") || undefined,
    pol: formData.get("pol"),
    pod: formData.get("pod"),
    numberOfBoxes: formData.get("numberOfBoxes") || undefined,
    grossWeight: formData.get("grossWeight") || undefined,
    netWeight: formData.get("netWeight") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const shipment = await prisma.shipment.findFirst({
    where: { id: data.shipmentId, organizationId: user.organizationId },
  });
  if (!shipment) return { error: "Shipment not found" };

  const stuffing = await prisma.factoryStuffing.create({
    data: {
      organizationId: user.organizationId,
      shipmentId: data.shipmentId,
      containerNumber: data.containerNumber,
      containerSize: data.containerSize,
      sealNumber: data.sealNumber,
      contactNumber: data.contactNumber,
      transporterId: data.transporterId,
      pol: data.pol,
      pod: data.pod,
      numberOfBoxes: data.numberOfBoxes,
      grossWeight: data.grossWeight,
      netWeight: data.netWeight,
      status: "SCHEDULED",
      createdById: user.id,
    },
  });

  if (shipment.currentStage === "INVOICE" || shipment.currentStage === "DISPATCH") {
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { currentStage: "STUFFING" },
    });
  }

  await prisma.shipmentTimelineEvent.create({
    data: {
      shipmentId: shipment.id,
      stage: "STUFFING",
      title: "Factory stuffing scheduled",
      description: `Container ${data.containerNumber} scheduled for stuffing.`,
      actorId: user.id,
    },
  });

  revalidatePath("/stuffing");
  redirect(`/stuffing/${stuffing.id}`);
}

export async function updateStuffingChecklistAction(stuffingId: string, formData: FormData) {
  const user = await requireUser("stuffing");
  const stuffing = await prisma.factoryStuffing.findFirst({
    where: { id: stuffingId, organizationId: user.organizationId },
  });
  if (!stuffing) throw new Error("Stuffing record not found");

  await prisma.factoryStuffing.update({
    where: { id: stuffingId },
    data: {
      checklistContainerClean: formData.get("checklistContainerClean") === "on",
      checklistContainerDamage: formData.get("checklistContainerDamage") === "on",
      checklistSealApplied: formData.get("checklistSealApplied") === "on",
      checklistDocumentsUploaded: formData.get("checklistDocumentsUploaded") === "on",
    },
  });

  revalidatePath(`/stuffing/${stuffingId}`);
}

const STATUS_TRANSITIONS: Record<StuffingStatus, StuffingStatus[]> = {
  SCHEDULED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
};

export async function setStuffingStatusAction(stuffingId: string, nextStatus: StuffingStatus) {
  const user = await requireUser("stuffing");
  const stuffing = await prisma.factoryStuffing.findFirst({
    where: { id: stuffingId, organizationId: user.organizationId },
  });
  if (!stuffing) throw new Error("Stuffing record not found");

  const allowed = STATUS_TRANSITIONS[stuffing.status as StuffingStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Cannot move stuffing from ${stuffing.status} to ${nextStatus}`);
  }

  await prisma.$transaction([
    prisma.factoryStuffing.update({
      where: { id: stuffingId },
      data: {
        status: nextStatus,
        stuffingStartTime: nextStatus === "IN_PROGRESS" ? new Date() : undefined,
        stuffingEndTime: nextStatus === "COMPLETED" ? new Date() : undefined,
      },
    }),
    prisma.shipmentTimelineEvent.create({
      data: {
        shipmentId: stuffing.shipmentId,
        stage: "STUFFING",
        title:
          nextStatus === "IN_PROGRESS" ? "Factory stuffing started" : "Factory stuffing completed",
        actorId: user.id,
      },
    }),
  ]);

  revalidatePath(`/stuffing/${stuffingId}`);
  revalidatePath("/stuffing");
}

export async function generateStuffingReportAction(stuffingId: string) {
  const user = await requireUser("stuffing");
  await generateStuffingReport(stuffingId, user.organizationId);
  revalidatePath(`/stuffing/${stuffingId}`);
}

export async function uploadStuffingDocumentAction(stuffingId: string, formData: FormData) {
  const user = await requireUser("stuffing");
  const stuffing = await prisma.factoryStuffing.findFirst({
    where: { id: stuffingId, organizationId: user.organizationId },
  });
  if (!stuffing) throw new Error("Stuffing record not found");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No file selected");

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await uploadDocumentFile(user.organizationId, "stuffing-attachment", file.name, buffer, file.type);

  const categoryHint = formData.get("category");
  const category =
    typeof categoryHint === "string" && categoryHint in DocumentCategory
      ? (categoryHint as DocumentCategory)
      : DocumentCategory.PHOTO;

  await prisma.document.create({
    data: {
      organizationId: user.organizationId,
      shipmentId: stuffing.shipmentId,
      factoryStuffingId: stuffingId,
      entityType: "STUFFING",
      category,
      fileName: file.name,
      fileUrl: path,
      fileType: file.type,
      fileSizeBytes: file.size,
      uploadedById: user.id,
    },
  });

  revalidatePath(`/stuffing/${stuffingId}`);
}
