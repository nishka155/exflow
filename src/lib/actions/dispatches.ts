"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { uploadDocumentFile } from "@/lib/storage/s3";
import { dispatchSchema } from "@/lib/validations/dispatch";
import { notifyRoles } from "@/lib/actions/notifications";
import type { DispatchStatus } from "@/lib/constants/statuses";

export interface ActionResult {
  error?: string;
}

function parseDispatchForm(formData: FormData) {
  return dispatchSchema.safeParse({
    shipmentId: formData.get("shipmentId"),
    truckNumber: formData.get("truckNumber"),
    driverName: formData.get("driverName"),
    driverMobile: formData.get("driverMobile"),
    transporterId: formData.get("transporterId"),
    material: formData.get("material"),
    referenceNumber: formData.get("referenceNumber") || undefined,
    numberOfWeights: formData.get("numberOfWeights") || undefined,
    numberOfBlocks: formData.get("numberOfBlocks") || undefined,
    dispatchDate: formData.get("dispatchDate"),
    expectedFactoryArrival: formData.get("expectedFactoryArrival"),
  });
}

export async function createDispatchAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser("dispatches");
  const parsed = parseDispatchForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const shipment = await prisma.shipment.findFirst({
    where: { id: data.shipmentId, organizationId: user.organizationId },
  });
  if (!shipment) return { error: "Shipment not found" };

  const dispatch = await prisma.truckDispatch.create({
    data: {
      organizationId: user.organizationId,
      shipmentId: data.shipmentId,
      truckNumber: data.truckNumber,
      driverName: data.driverName,
      driverMobile: data.driverMobile,
      transporterId: data.transporterId,
      material: data.material,
      referenceNumber: data.referenceNumber,
      numberOfWeights: data.numberOfWeights,
      numberOfBlocks: data.numberOfBlocks,
      dispatchDate: new Date(data.dispatchDate),
      expectedFactoryArrival: new Date(data.expectedFactoryArrival),
      status: "PENDING",
      createdById: user.id,
    },
  });

  if (shipment.currentStage === "INVOICE") {
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { currentStage: "DISPATCH" },
    });
  }

  await prisma.shipmentTimelineEvent.create({
    data: {
      shipmentId: shipment.id,
      stage: "DISPATCH",
      title: "Truck dispatch created",
      description: `${data.truckNumber} scheduled for dispatch.`,
      actorId: user.id,
    },
  });

  revalidatePath("/dispatches");
  redirect(`/dispatches/${dispatch.id}`);
}

const STATUS_TRANSITIONS: Record<DispatchStatus, DispatchStatus[]> = {
  PENDING: ["DISPATCHED", "DELAY"],
  DISPATCHED: ["REACHED_FACTORY", "DELAY"],
  DELAY: ["DISPATCHED", "REACHED_FACTORY"],
  REACHED_FACTORY: [],
};

export async function setDispatchStatusAction(dispatchId: string, nextStatus: DispatchStatus) {
  const user = await requireUser("dispatches");
  const dispatch = await prisma.truckDispatch.findFirst({
    where: { id: dispatchId, organizationId: user.organizationId },
  });
  if (!dispatch) throw new Error("Dispatch not found");

  const allowed = STATUS_TRANSITIONS[dispatch.status as DispatchStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Cannot move dispatch from ${dispatch.status} to ${nextStatus}`);
  }

  await prisma.$transaction([
    prisma.truckDispatch.update({
      where: { id: dispatchId },
      data: {
        status: nextStatus,
        actualFactoryArrival: nextStatus === "REACHED_FACTORY" ? new Date() : undefined,
      },
    }),
    prisma.shipmentTimelineEvent.create({
      data: {
        shipmentId: dispatch.shipmentId,
        stage: "DISPATCH",
        title:
          nextStatus === "REACHED_FACTORY"
            ? "Truck reached factory"
            : nextStatus === "DELAY"
              ? "Truck delayed"
              : "Truck dispatched",
        actorId: user.id,
      },
    }),
  ]);

  if (nextStatus === "DELAY") {
    await notifyRoles(user.organizationId, ["ADMIN", "EXPORT_MANAGER", "TRANSPORT_COORDINATOR"], {
      type: "TRUCK_DELAY",
      title: `Truck ${dispatch.truckNumber} delayed`,
      body: `Dispatch for shipment is running behind schedule.`,
      entityType: "DISPATCH",
      entityId: dispatchId,
    });
  }

  revalidatePath(`/dispatches/${dispatchId}`);
  revalidatePath("/dispatches");
}

export async function uploadDispatchDocumentAction(dispatchId: string, formData: FormData) {
  const user = await requireUser("dispatches");
  const dispatch = await prisma.truckDispatch.findFirst({
    where: { id: dispatchId, organizationId: user.organizationId },
  });
  if (!dispatch) throw new Error("Dispatch not found");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No file selected");

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await uploadDocumentFile(user.organizationId, "dispatch-attachment", file.name, buffer, file.type);

  await prisma.document.create({
    data: {
      organizationId: user.organizationId,
      shipmentId: dispatch.shipmentId,
      truckDispatchId: dispatchId,
      entityType: "DISPATCH",
      category: "OTHER",
      fileName: file.name,
      fileUrl: path,
      fileType: file.type,
      fileSizeBytes: file.size,
      uploadedById: user.id,
    },
  });

  revalidatePath(`/dispatches/${dispatchId}`);
}
