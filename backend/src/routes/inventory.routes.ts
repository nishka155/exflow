import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";
import { HttpError } from "../middleware/error-handler";
import { inventoryItemSchema, inventoryMovementSchema } from "../lib/validations/inventory";

const router = Router();

router.use(requireAuth, requireRole("inventory"));

router.get("/", async (req, res, next) => {
  try {
    const { search } = req.query as { search?: string };
    const items = await prisma.inventoryItem.findMany({
      where: {
        organizationId: req.user!.organizationId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { category: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get("/summary", async (req, res, next) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { organizationId: req.user!.organizationId },
      select: { currentStock: true, reorderLevel: true, unitValue: true },
    });
    const lowStockCount = items.filter(
      (i) => i.reorderLevel != null && i.currentStock.lte(i.reorderLevel)
    ).length;
    const totalValue = items.reduce(
      (sum, i) => sum + (i.unitValue ? i.currentStock.toNumber() * i.unitValue.toNumber() : 0),
      0
    );
    res.json({ totalItems: items.length, lowStockCount, totalValue });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: {
        createdBy: { select: { id: true, name: true } },
        movements: {
          orderBy: { createdAt: "desc" },
          include: {
            recordedBy: { select: { id: true, name: true } },
            booking: { select: { id: true, bookingNumber: true } },
          },
        },
      },
    });
    if (!item) throw new HttpError(404, "Inventory item not found");
    res.json(item);
  } catch (err) {
    next(err);
  }
});

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

router.put("/:id", async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const parsed = inventoryItemSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const item = await prisma.inventoryItem.findFirst({
      where: { id: itemId, organizationId: req.user!.organizationId },
    });
    if (!item) throw new HttpError(404, "Inventory item not found");

    const updated = await prisma.inventoryItem.update({ where: { id: itemId }, data: parsed.data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const item = await prisma.inventoryItem.findFirst({
      where: { id: itemId, organizationId: req.user!.organizationId },
      include: { _count: { select: { movements: true } } },
    });
    if (!item) throw new HttpError(404, "Inventory item not found");
    if (item._count.movements > 0) {
      throw new HttpError(409, "Can't delete an item with stock movement history");
    }
    await prisma.inventoryItem.delete({ where: { id: itemId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post("/:id/movements", async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const parsed = inventoryMovementSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const { type, quantity, reason, bookingId } = parsed.data;
    const organizationId = req.user!.organizationId;

    const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, organizationId } });
    if (!item) throw new HttpError(404, "Inventory item not found");

    if (bookingId) {
      const booking = await prisma.booking.findFirst({ where: { id: bookingId, organizationId } });
      if (!booking) throw new HttpError(400, "Booking not found");
    }

    if (type === "OUT" && item.currentStock.lt(quantity)) {
      throw new HttpError(409, `Not enough stock — only ${item.currentStock} ${item.unit} available`);
    }

    const [, updatedItem] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          organizationId,
          itemId,
          type,
          quantity,
          reason,
          bookingId: bookingId || null,
          recordedById: req.user!.id,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentStock:
            type === "IN" ? { increment: quantity } : { decrement: quantity },
        },
      }),
    ]);

    res.status(201).json(updatedItem);
  } catch (err) {
    next(err);
  }
});

export default router;
