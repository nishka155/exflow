import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";

// Minimal read-only listing — the Customers module itself isn't migrated in
// this pilot, but the Invoices create/edit forms need a customer dropdown.
// Matches the original page loaders' behavior: any authenticated org member
// can list their org's customers, no separate "customers" role check.
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

export default router;
