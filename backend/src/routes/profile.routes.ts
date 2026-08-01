import { Router } from "express";
import { randomUUID } from "crypto";

import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { HttpError } from "../middleware/error-handler";
import { generateToken } from "../lib/tokens";
import { sendMail } from "../lib/email/resend";
import { ROLES, type Role } from "../lib/constants/roles";

const router = Router();

router.use(requireAuth);

router.put("/me", async (req, res, next) => {
  try {
    const { name, phone } = req.body as { name?: string; phone?: string };
    if (typeof name !== "string" || name.trim().length < 2) {
      throw new HttpError(400, "Name is required");
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name: name.trim(), phone: phone || null },
    });

    res.json({
      id: updated.id,
      organizationId: updated.organizationId,
      email: updated.email,
      name: updated.name,
      role: updated.role,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    if (req.user!.role !== "ADMIN") throw new HttpError(403, "Only admins can view workspace members");
    const users = await prisma.user.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.post("/users/invite", async (req, res, next) => {
  try {
    if (req.user!.role !== "ADMIN") throw new HttpError(403, "Only admins can invite users");

    const { email, name, role } = req.body as { email?: string; name?: string; role?: string };
    if (!email) throw new HttpError(400, "Email is required");
    if (!name) throw new HttpError(400, "Name is required");
    if (!role || !ROLES.includes(role as Role)) throw new HttpError(400, "Role is required");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, "A user with that email already exists");

    const newUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        organizationId: req.user!.organizationId,
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

    const appUrl = process.env.CORS_ORIGIN ?? "http://localhost:3000";
    await sendMail({
      to: email,
      subject: "You've been invited to your ExFlow workspace",
      html: `<p>You've been invited to join your team's ExFlow workspace. Click below to set your password and get started. This link expires in 7 days.</p><p><a href="${appUrl}/accept-invite?token=${token}">Accept invite</a></p>`,
    });

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
