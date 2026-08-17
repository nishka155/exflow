import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { Customer } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";
import { HttpError } from "../middleware/error-handler";
import { getSignedDownloadUrl } from "../lib/storage/s3";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customer?: Customer;
    }
  }
}

async function requireCustomer(req: Request, _res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== "CUSTOMER") {
      throw new HttpError(403, "Not authorized for this module");
    }
    const customer = await prisma.customer.findUnique({ where: { portalUserId: req.user!.id } });
    if (!customer) throw new HttpError(404, "Customer record not found");
    req.customer = customer;
    next();
  } catch (err) {
    next(err);
  }
}

const router = Router();

router.use(requireAuth, requireCustomer);

router.get("/me", async (req, res) => {
  res.json(req.customer);
});

router.get("/bookings", async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { customerId: req.customer!.id },
      include: { invoice: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

router.get("/bookings/:id", async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, customerId: req.customer!.id },
      include: {
        invoice: true,
        truckDispatches: { include: { transporter: true }, orderBy: { createdAt: "asc" } },
        factoryStuffings: { orderBy: { createdAt: "asc" } },
        gateIns: { orderBy: { createdAt: "asc" } },
        shippingInstruction: true,
        billOfLading: true,
        documents: { orderBy: { createdAt: "desc" } },
        timelineEvents: { orderBy: { occurredAt: "asc" } },
      },
    });
    if (!booking) throw new HttpError(404, "Booking not found");
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

router.get("/invoices", async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { customerId: req.customer!.id },
      include: { booking: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(invoices);
  } catch (err) {
    next(err);
  }
});

router.get("/documents", async (req, res, next) => {
  try {
    const documents = await prisma.document.findMany({
      where: { booking: { customerId: req.customer!.id } },
      include: { booking: { select: { bookingNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(documents);
  } catch (err) {
    next(err);
  }
});

router.get("/invoices/:id/pdf", async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, customerId: req.customer!.id },
    });
    if (!invoice || !invoice.pdfUrl) throw new HttpError(404, "PDF not found");
    const url = await getSignedDownloadUrl(invoice.pdfUrl);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

router.get("/shipping-instructions/:id/pdf", async (req, res, next) => {
  try {
    const si = await prisma.shippingInstruction.findFirst({
      where: { id: req.params.id, booking: { customerId: req.customer!.id } },
    });
    if (!si || !si.pdfUrl) throw new HttpError(404, "PDF not found");
    const url = await getSignedDownloadUrl(si.pdfUrl);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

router.get("/bills-of-lading/:id/pdf", async (req, res, next) => {
  try {
    const bl = await prisma.billOfLading.findFirst({
      where: { id: req.params.id, booking: { customerId: req.customer!.id } },
    });
    if (!bl || !bl.pdfUrl) throw new HttpError(404, "PDF not found");
    const url = await getSignedDownloadUrl(bl.pdfUrl);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

export default router;
