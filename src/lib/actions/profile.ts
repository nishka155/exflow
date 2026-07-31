"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { generateToken } from "@/lib/auth/tokens";
import { sendMail } from "@/lib/email/resend";
import type { Role } from "@/lib/constants/roles";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function updateProfileAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const name = formData.get("name");
  const phone = formData.get("phone");
  if (typeof name !== "string" || name.trim().length < 2) {
    return { error: "Name is required" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: name.trim(), phone: typeof phone === "string" && phone ? phone : null },
  });

  revalidatePath("/settings/profile");
  return { success: true };
}

export async function inviteUserAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { error: "Only admins can invite users" };

  const email = formData.get("email");
  const name = formData.get("name");
  const role = formData.get("role");
  if (typeof email !== "string" || !email) return { error: "Email is required" };
  if (typeof name !== "string" || !name) return { error: "Name is required" };
  if (typeof role !== "string" || !role) return { error: "Role is required" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with that email already exists" };

  const newUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      organizationId: user.organizationId,
      email,
      name,
      role: role as Role,
      passwordHash: null,
    },
  });

  const { token, tokenHash } = generateToken();
  await prisma.authToken.create({
    data: {
      userId: newUser.id,
      type: "INVITE",
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendMail({
    to: email,
    subject: "You've been invited to your ExFlow workspace",
    html: `<p>You've been invited to join your team's ExFlow workspace. Click below to set your password and get started. This link expires in 7 days.</p><p><a href="${appUrl}/accept-invite?token=${token}">Accept invite</a></p>`,
  });

  revalidatePath("/settings/users");
  return { success: true };
}
