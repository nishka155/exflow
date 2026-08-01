import { Router } from "express";
import type { DocumentCategory } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { HttpError } from "../middleware/error-handler";
import { getSignedDownloadUrl } from "../lib/storage/s3";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { q, category } = req.query as { q?: string; category?: string };
    const documents = await prisma.document.findMany({
      where: {
        organizationId: req.user!.organizationId,
        ...(category ? { category: category as DocumentCategory } : {}),
        ...(q ? { fileName: { contains: q, mode: "insensitive" } } : {}),
      },
      include: {
        booking: { select: { bookingNumber: true } },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(documents);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/download", async (req, res, next) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: { booking: { select: { customerId: true } } },
    });
    if (!document) throw new HttpError(404, "Document not found");

    if (req.user!.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: { portalUserId: req.user!.id },
      });
      if (!customer || document.booking?.customerId !== customer.id) {
        throw new HttpError(404, "Document not found");
      }
    }

    const url = await getSignedDownloadUrl(document.fileUrl);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

export default router;
