"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { organization_id: user.organizationId, name, role },
  });
  if (error) return { error: error.message };

  revalidatePath("/settings/users");
  return { success: true };
}
