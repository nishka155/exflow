"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { customerSchema } from "@/lib/validations/customer";

export interface ActionResult {
  error?: string;
}

function parseCustomerForm(formData: FormData) {
  return customerSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code") || undefined,
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    country: formData.get("country"),
    gstNumber: formData.get("gstNumber") || undefined,
    contactPerson: formData.get("contactPerson") || undefined,
    contactEmail: formData.get("contactEmail") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
  });
}

export async function createCustomerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser("customers");
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.customer.create({
    data: { organizationId: user.organizationId, ...parsed.data },
  });

  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomerAction(
  customerId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser("customers");
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: user.organizationId },
  });
  if (!customer) return { error: "Customer not found" };

  await prisma.customer.update({ where: { id: customerId }, data: parsed.data });

  revalidatePath("/customers");
  redirect("/customers");
}
