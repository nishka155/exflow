import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";

// Minimal read-only listing — mirrors customers.routes.ts. Any authenticated
// org member can list their org's transporters (used by dispatch/stuffing
// "new" forms' dropdowns), no separate role check.
const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const transporters = await prisma.transporter.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: { name: "asc" },
    });
    res.json(transporters);
  } catch (err) {
    next(err);
  }
});

export default router;
