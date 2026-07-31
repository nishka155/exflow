"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { generateToken } from "@/lib/auth/tokens";
import { sendMail } from "@/lib/email/resend";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function invitePortalUserAction(
  customerId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser("customers");
  const email = formData.get("email");
  const name = formData.get("name");
  if (typeof email !== "string" || !email) return { error: "Email is required" };
  if (typeof name !== "string" || !name) return { error: "Name is required" };

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: user.organizationId },
  });
  if (!customer) return { error: "Customer not found" };
  if (customer.portalUserId) return { error: "This customer already has portal access" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with that email already exists" };

  const newUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      organizationId: user.organizationId,
      email,
      name,
      role: "CUSTOMER",
      passwordHash: null,
    },
  });

  await prisma.customer.update({
    where: { id: customerId },
    data: { portalUserId: newUser.id },
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
    subject: "You've been invited to your ExFlow customer portal",
    html: `<p>You've been invited to track your shipments on ExFlow. Click below to set your password and get started. This link expires in 7 days.</p><p><a href="${appUrl}/accept-invite?token=${token}">Accept invite</a></p>`,
  });

  revalidatePath(`/customers/${customerId}/edit`);
  return { success: true };
}
