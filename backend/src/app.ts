import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes";
import invoicesRoutes from "./routes/invoices.routes";
import customersRoutes from "./routes/customers.routes";
import transportersRoutes from "./routes/transporters.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import bookingsRoutes from "./routes/bookings.routes";
import dispatchesRoutes from "./routes/dispatches.routes";
import stuffingRoutes from "./routes/stuffing.routes";
import gateInRoutes from "./routes/gate-in.routes";
import shippingInstructionsRoutes from "./routes/shipping-instructions.routes";
import billsOfLadingRoutes from "./routes/bills-of-lading.routes";
import sobRoutes from "./routes/sob.routes";
import reportsRoutes from "./routes/reports.routes";
import notificationsRoutes from "./routes/notifications.routes";
import portalRoutes from "./routes/portal.routes";
import documentsRoutes from "./routes/documents.routes";
import profileRoutes from "./routes/profile.routes";
import { errorHandler } from "./middleware/error-handler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/invoices", invoicesRoutes);
  app.use("/api/customers", customersRoutes);
  app.use("/api/transporters", transportersRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/bookings", bookingsRoutes);
  app.use("/api/dispatches", dispatchesRoutes);
  app.use("/api/stuffing", stuffingRoutes);
  app.use("/api/gate-in", gateInRoutes);
  app.use("/api/shipping-instructions", shippingInstructionsRoutes);
  app.use("/api/bills-of-lading", billsOfLadingRoutes);
  app.use("/api/sob", sobRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/portal", portalRoutes);
  app.use("/api/documents", documentsRoutes);
  app.use("/api/profile", profileRoutes);

  app.use(errorHandler);

  return app;
}
