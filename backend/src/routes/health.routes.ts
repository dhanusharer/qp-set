import { Router } from "express";
import { prisma } from "../db.js";
import { metricsHandler } from "../middleware/observability/metrics.js";

export const healthRouter = Router();

healthRouter.get("/live", (_req, res) => res.json({ status: "ok" }));

healthRouter.get("/ready", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ready" });
});

healthRouter.get("/metrics", metricsHandler);
