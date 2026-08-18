import { Router } from "express";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { generateToken, hashToken } from "../lib/tokens";
import { sendMail } from "../lib/email/resend";
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../lib/validations/auth";
import { HttpError } from "../middleware/error-handler";
import { requireAuth } from "../middleware/require-auth";
import { loginRateLimit, signupRateLimit, forgotPasswordRateLimit } from "../middleware/rate-limit";

const router = Router();

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publicUser(user: { id: string; organizationId: string; email: string; name: string; role: string }) {
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

router.post("/signup", signupRateLimit, async (req, res, next) => {
  try {
    const parsed = signUpSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const { organizationName, name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new HttpError(409, "An account with that email already exists");
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

    let user;
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
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
      await prisma.organization.delete({ where: { id: organization.id } });
      throw err;
    }

    const token = signToken({ userId: user.id });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/login", loginRateLimit, async (req, res, next) => {
  try {
    const parsed = signInSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !user.isActive) {
      throw new HttpError(401, "Incorrect email or password");
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, "Incorrect email or password");
    }

    const token = signToken({ userId: user.id });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password", forgotPasswordRateLimit, async (req, res, next) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
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

      const appUrl = process.env.CORS_ORIGIN ?? "http://localhost:3000";
      await sendMail({
        to: user.email,
        subject: "Reset your ExFlow password",
        html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${appUrl}/reset-password?token=${token}">Reset password</a></p>`,
      });
    }

    // Always report success so we don't leak which emails have accounts.
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) throw new HttpError(400, "Invalid or missing reset link");

    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (
      !record ||
      record.type !== "PASSWORD_RESET" ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      throw new HttpError(400, "This reset link is invalid or has expired.");
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/accept-invite", async (req, res, next) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) throw new HttpError(400, "Invalid or missing invite link");

    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!record || record.type !== "INVITE" || record.usedAt || record.expiresAt < new Date()) {
      throw new HttpError(400, "This invite link is invalid or has expired.");
    }

    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new HttpError(400, "This invite link is invalid or has expired.");

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    const jwtToken = signToken({ userId: updatedUser.id });
    res.json({ token: jwtToken, user: publicUser(updatedUser) });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: req.user!.organizationId },
      select: { id: true, name: true },
    });
    res.json({ user: publicUser(req.user!), organization });
  } catch (err) {
    next(err);
  }
});

export default router;
