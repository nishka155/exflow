import { Router } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { HttpError } from "../middleware/error-handler";
import {
  inventoryItemSchema,
  inventoryMovementSchema,
  inventoryBulkImportSchema,
} from "../lib/validations/inventory";

const router = Router();
router.use(requireAuth, requireRole("inventory"));

const ADDS_STOCK = new Set(["IN", "RETURN", "ADJUSTMENT_IN"]);

function stockDelta(type: string, quantity: number): number {
  return ADDS_STOCK.has(type) ? quantity : -quantity;
}

// ── List ──────────────────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const {
      search,
      category,
      lowStock,
      page = "1",
      pageSize = "50",
    } = req.query as Record<string, string | undefined>;

    const skip = (Number(page) - 1) * Number(pageSize);
    const where = {
      organizationId: req.user!.organizationId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
              { category: { contains: search, mode: "insensitive" as const } },
              { supplier: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: Number(pageSize),
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    const filtered =
      lowStock === "true"
        ? items.filter(
            (i) =>
              i.reorderLevel != null &&
              new Decimal(i.currentStock).lte(new Decimal(i.reorderLevel))
          )
        : items;

    res.json({ items: filtered, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    next(err);
  }
});

// ── Summary ───────────────────────────────────────────────────────────
router.get("/summary", async (req, res, next) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { organizationId: req.user!.organizationId },
      select: { currentStock: true, reorderLevel: true, unitValue: true },
    });
    const lowStockCount = items.filter(
      (i) =>
        i.reorderLevel != null &&
        new Decimal(i.currentStock).lte(new Decimal(i.reorderLevel))
    ).length;
    const totalValue = items.reduce(
      (sum, i) =>
        sum +
        (i.unitValue
          ? new Decimal(i.currentStock).mul(new Decimal(i.unitValue)).toNumber()
          : 0),
      0
    );
    res.json({ totalItems: items.length, lowStockCount, totalValue });
  } catch (err) {
    next(err);
  }
});

// ── Categories ────────────────────────────────────────────────────────
router.get("/categories", async (req, res, next) => {
  try {
    const rows = await prisma.inventoryItem.findMany({
      where: {
        organizationId: req.user!.organizationId,
        category: { not: null },
      },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    res.json(rows.map((r) => r.category).filter(Boolean));
  } catch (err) {
    next(err);
  }
});

// ── Bulk import ───────────────────────────────────────────────────────
router.post("/bulk-import", async (req, res, next) => {
  try {
    const parsed = inventoryBulkImportSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const orgId = req.user!.organizationId;
    const userId = req.user!.id;
    let created = 0;
    const errors: { row: number; name: string; error: string }[] = [];

    for (let i = 0; i < parsed.data.items.length; i++) {
      const { openingStock, ...itemData } = parsed.data.items[i];
      try {
        const item = await prisma.inventoryItem.create({
          data: { organizationId: orgId, createdById: userId, ...itemData },
        });
        if (openingStock && openingStock > 0) {
          await prisma.$transaction([
            prisma.inventoryMovement.create({
              data: {
                organizationId: orgId,
                itemId: item.id,
                type: "IN",
                quantity: openingStock,
                runningBalance: openingStock,
                reason: "Opening stock (bulk import)",
                recordedById: userId,
              },
            }),
            prisma.inventoryItem.update({
              where: { id: item.id },
              data: { currentStock: { increment: openingStock } },
            }),
          ]);
        }
        created++;
      } catch (e) {
        errors.push({ row: i + 1, name: itemData.name, error: (e as Error).message });
      }
    }

    res.status(201).json({ created, errors });
  } catch (err) {
    next(err);
  }
});

// ── Single item ───────────────────────────────────────────────────────
router.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: {
        createdBy: { select: { id: true, name: true } },
        movements: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            recordedBy: { select: { id: true, name: true } },
            booking: { select: { id: true, bookingNumber: true } },
          },
        },
      },
    });
    if (!item) throw new HttpError(404, "Inventory item not found");

    // Analytics: consumption over last 90 days
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const outMovements = item.movements.filter(
      (m) =>
        !ADDS_STOCK.has(m.type) &&
        new Date(m.createdAt) >= since
    );
    const consumed90d = outMovements.reduce(
      (s, m) => s + new Decimal(m.quantity).toNumber(),
      0
    );
    const avgMonthlyConsumption = (consumed90d / 90) * 30;
    const daysRemaining =
      avgMonthlyConsumption > 0
        ? Math.floor(
            (new Decimal(item.currentStock).toNumber() / avgMonthlyConsumption) * 30
          )
        : null;

    res.json({ ...item, analytics: { consumed90d, avgMonthlyConsumption, daysRemaining } });
  } catch (err) {
    next(err);
  }
});

// ── Create item ───────────────────────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const parsed = inventoryItemSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const item = await prisma.inventoryItem.create({
      data: {
        organizationId: req.user!.organizationId,
        createdById: req.user!.id,
        ...parsed.data,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// ── Update item ───────────────────────────────────────────────────────
router.put("/:id", async (req, res, next) => {
  try {
    const parsed = inventoryItemSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const item = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!item) throw new HttpError(404, "Inventory item not found");
    const updated = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── Delete item ───────────────────────────────────────────────────────
router.delete("/:id", async (req, res, next) => {
  try {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: { _count: { select: { movements: true } } },
    });
    if (!item) throw new HttpError(404, "Inventory item not found");
    if (item._count.movements > 0) {
      throw new HttpError(409, "Can't delete an item with stock movement history");
    }
    await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── Record movement ───────────────────────────────────────────────────
router.post("/:id/movements", async (req, res, next) => {
  try {
    const parsed = inventoryMovementSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const { type, quantity, reason, referenceNumber, bookingId } = parsed.data;
    const orgId = req.user!.organizationId;

    const item = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, organizationId: orgId },
    });
    if (!item) throw new HttpError(404, "Inventory item not found");

    if (bookingId) {
      const booking = await prisma.booking.findFirst({ where: { id: bookingId, organizationId: orgId } });
      if (!booking) throw new HttpError(400, "Booking not found");
    }

    const delta = stockDelta(type, quantity);
    const newStock = new Decimal(item.currentStock).plus(delta);
    if (newStock.lt(0)) {
      throw new HttpError(
        409,
        `Insufficient stock — only ${item.currentStock} ${item.unit} available`
      );
    }

    const [, updatedItem] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          organizationId: orgId,
          itemId: item.id,
          type: type as any,
          quantity,
          runningBalance: newStock,
          reason: reason || null,
          referenceNumber: referenceNumber || null,
          bookingId: bookingId || null,
          recordedById: req.user!.id,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: newStock },
      }),
    ]);

    res.status(201).json(updatedItem);
  } catch (err) {
    next(err);
  }
});

export default router;
