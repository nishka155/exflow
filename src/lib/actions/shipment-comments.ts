"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export async function addShipmentCommentAction(shipmentId: string, formData: FormData) {
  const user = await requireUser();
  const body = formData.get("body");
  if (typeof body !== "string" || body.trim().length === 0) {
    throw new Error("Comment cannot be empty");
  }

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, organizationId: user.organizationId },
  });
  if (!shipment) throw new Error("Shipment not found");

  await prisma.shipmentComment.create({
    data: { shipmentId, authorId: user.id, body: body.trim() },
  });

  revalidatePath(`/shipments/${shipmentId}`);
}
