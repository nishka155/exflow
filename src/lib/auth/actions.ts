"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { signIn, signOut } from "@/lib/auth/auth";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { sendMail } from "@/lib/email/resend";
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

export interface ActionResult {
  error?: string;
}

export async function signUpAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    organizationName: formData.get("organizationName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { organizationName, name, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "An account with that email already exists" };
  }

  const baseSlug = slugify(organizationName) || "company";
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const organization = await prisma.organization.create({
    data: { name: organizationName, slug },
  });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        id: randomUUID(),
        organizationId: organization.id,
        email,
        name,
        role: "ADMIN",
        passwordHash,
      },
    });
  } catch (err) {
    console.error("[signUpAction] user creation failed:", err);
    await prisma.organization.delete({ where: { id: organization.id } });
    return { error: "Could not create account" };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but automatic sign-in failed — please log in." };
    }
    throw error;
  }

  return {};
}

export async function signInAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Incorrect email or password" };
    }
    throw error;
  }

  return {};
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function forgotPasswordAction(
  _prev: ActionResult & { success?: boolean },
  formData: FormData
): Promise<ActionResult & { success?: boolean }> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const { token, tokenHash } = generateToken();
    await prisma.authToken.create({
      data: {
        userId: user.id,
        type: "PASSWORD_RESET",
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await sendMail({
      to: user.email,
      subject: "Reset your ExFlow password",
      html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${appUrl}/reset-password?token=${token}">Reset password</a></p>`,
    });
  }

  // Always report success so we don't leak which emails have accounts.
  return { success: true };
}

export async function resetPasswordAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) {
    return { error: "Invalid or missing reset link" };
  }

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (
    !record ||
    record.type !== "PASSWORD_RESET" ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  redirect("/login?reset=success");
}

export async function acceptInviteAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) {
    return { error: "Invalid or missing invite link" };
  }

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== "INVITE" || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This invite link is invalid or has expired." };
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) {
    return { error: "This invite link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  const redirectTo = user.role === "CUSTOMER" ? "/portal" : "/dashboard";
  try {
    await signIn("credentials", { email: user.email, password: parsed.data.password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login");
    }
    throw error;
  }

  return {};
}
