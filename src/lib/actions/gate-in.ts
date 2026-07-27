"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { uploadDocumentFile } from "@/lib/supabase/storage";
import { gateInSchema } from "@/lib/validations/gate-in";

export interface ActionResult {
  error?: string;
}

export async function createGateInAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser("gate-in");
  const parsed = gateInSchema.safeParse({
    factoryStuffingId: formData.get("factoryStuffingId"),
    gateInDate: formData.get("gateInDate"),
    terminal: formData.get("terminal"),
    yard: formData.get("yard") || undefined,
    vehicleNumber: formData.get("vehicleNumber") || undefined,
    form13Updated: formData.get("form13Updated") === "on",
    gatePass: formData.get("gatePass") || undefined,
    eirNumber: formData.get("eirNumber") || undefined,
    remarks: formData.get("remarks") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const stuffing = await prisma.factoryStuffing.findFirst({
    where: { id: data.factoryStuffingId, organizationId: user.organizationId },
  });
  if (!stuffing) return { error: "Stuffing record not found" };

  const gateIn = await prisma.gateIn.create({
    data: {
      organizationId: user.organizationId,
      shipmentId: stuffing.shipmentId,
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

  await prisma.shipment.update({
    where: { id: stuffing.shipmentId },
    data: { currentStage: "GATE_IN" },
  });

  await prisma.shipmentTimelineEvent.create({
    data: {
      shipmentId: stuffing.shipmentId,
      stage: "GATE_IN",
      title: "Container gated in",
      description: `${stuffing.containerNumber} gated in at ${data.terminal}.`,
      actorId: user.id,
    },
  });

  revalidatePath("/gate-in");
  redirect(`/gate-in/${gateIn.id}`);
}

export async function uploadGateInDocumentAction(gateInId: string, formData: FormData) {
  const user = await requireUser("gate-in");
  const gateIn = await prisma.gateIn.findFirst({
    where: { id: gateInId, organizationId: user.organizationId },
  });
  if (!gateIn) throw new Error("Gate-in record not found");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No file selected");

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await uploadDocumentFile(user.organizationId, "gate-in-attachment", file.name, buffer, file.type);

  await prisma.document.create({
    data: {
      organizationId: user.organizationId,
      shipmentId: gateIn.shipmentId,
      gateInId,
      entityType: "GATE_IN",
      category: "GATE_PASS",
      fileName: file.name,
      fileUrl: path,
      fileType: file.type,
      fileSizeBytes: file.size,
      uploadedById: user.id,
    },
  });

  revalidatePath(`/gate-in/${gateInId}`);
}
