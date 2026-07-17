import "express-async-errors";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { apiRateLimit } from "./middleware/rateLimit.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { csrfProtection } from "./middleware/csrf.js";
import { openApiDocument } from "./docs/openapi.js";
import { authRouter } from "./routes/auth.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import { coursesRouter } from "./routes/courses.routes.js";
import { assignmentsRouter } from "./routes/assignments.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { schemesRouter } from "./routes/schemes.routes.js";
import { assessmentsRouter } from "./routes/assessments.routes.js";

import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    const reqId = req.header("x-request-id") || randomUUID();
    req.id = reqId;
    res.setHeader("x-request-id", reqId);
    next();
  });

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (origin === env.FRONTEND_ORIGIN || origin.endsWith(".vercel.app")) {
          return callback(null, true);
        }
        callback(null, false);
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ 
    logger,
    genReqId: (req) => req.id || randomUUID()
  }));
  app.use("/api", apiRateLimit);
  app.use(csrfProtection);

  app.use("/health", healthRouter);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/courses", coursesRouter);
  app.use("/api/v1/assignments", assignmentsRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/schemes", schemesRouter);
  app.use("/api/v1/assessments", assessmentsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
