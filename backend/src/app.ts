import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes";
import invoicesRoutes from "./routes/invoices.routes";
import customersRoutes from "./routes/customers.routes";
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

  app.use(errorHandler);

  return app;
}
