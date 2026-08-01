import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";

export async function notifyRoles(
  organizationId: string,
  roles: string[],
  payload: {
    type: NotificationType;
    title: string;
    body?: string;
    entityType?: string;
    entityId?: string;
  }
) {
  const users = await prisma.user.findMany({
    where: { organizationId, role: { in: roles as never[] } },
    select: { id: true },
  });
  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      organizationId,
      userId: u.id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      entityType: payload.entityType,
      entityId: payload.entityId,
    })),
  });
}
