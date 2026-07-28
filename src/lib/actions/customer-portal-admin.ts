"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { organization_id: user.organizationId, name, role: "CUSTOMER" },
  });
  if (error || !data.user) return { error: error?.message ?? "Could not send invite" };

  await prisma.customer.update({
    where: { id: customerId },
    data: { portalUserId: data.user.id },
  });

  revalidatePath(`/customers/${customerId}/edit`);
  return { success: true };
}
