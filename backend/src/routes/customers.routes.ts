import { Router } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { HttpError } from "../middleware/error-handler";
import { generateToken } from "../lib/tokens";
import { sendMail } from "../lib/email/resend";
import { customerSchema } from "../lib/validations/customer";

// GET / is intentionally open to any authenticated org member (no "customers"
// role check) — the Invoices/Dispatches/Stuffing "new" forms all need a
// customer dropdown regardless of the current user's module access.
const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: { name: "asc" },
    });
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireRole("customers"), async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: String(req.params.id), organizationId: req.user!.organizationId },
      include: { portalUser: { select: { email: true } } },
    });
    if (!customer) throw new HttpError(404, "Customer not found");
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireRole("customers"), async (req, res, next) => {
  try {
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const customer = await prisma.customer.create({
      data: { organizationId: req.user!.organizationId, ...parsed.data },
    });

    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireRole("customers"), async (req, res, next) => {
  try {
    const customerId = String(req.params.id);
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: req.user!.organizationId },
    });
    if (!customer) throw new HttpError(404, "Customer not found");

    const updated = await prisma.customer.update({ where: { id: customerId }, data: parsed.data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/invite-portal-user", requireRole("customers"), async (req, res, next) => {
  try {
    const customerId = String(req.params.id);
    const { email, name } = req.body as { email?: string; name?: string };
    if (!email) throw new HttpError(400, "Email is required");
    if (!name) throw new HttpError(400, "Name is required");

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: req.user!.organizationId },
    });
    if (!customer) throw new HttpError(404, "Customer not found");
    if (customer.portalUserId) throw new HttpError(409, "This customer already has portal access");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, "A user with that email already exists");

    const newUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        organizationId: req.user!.organizationId,
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

    const appUrl = process.env.CORS_ORIGIN ?? "http://localhost:3000";
    await sendMail({
      to: email,
      subject: "You've been invited to your ExFlow customer portal",
      html: `<p>You've been invited to track your bookings on ExFlow. Click below to set your password and get started. This link expires in 7 days.</p><p><a href="${appUrl}/accept-invite?token=${token}">Accept invite</a></p>`,
    });

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
