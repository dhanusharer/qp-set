import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const log = req.log || logger;

  if (err instanceof ZodError) {
    log.warn({ err: err.flatten() }, "Validation failure");
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: err.flatten()
      }
    });
  }

  if (err instanceof ApiError) {
    let code = "API_ERROR";
    if (err.statusCode === 401) code = "UNAUTHORIZED";
    else if (err.statusCode === 403) code = "FORBIDDEN";
    else if (err.statusCode === 404) code = "NOT_FOUND";
    else if (err.statusCode === 409) code = "CONFLICT";

    log.warn({ err: err.message, code, statusCode: err.statusCode }, "API error returned");

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code,
        message: err.message
      }
    });
  }

  // Intercept Prisma / Database failures specifically
  if (err instanceof Error && (err.constructor.name.startsWith("PrismaClient") || (err as any).code?.startsWith("P"))) {
    log.error({ err }, "Database query execution failure");
    const prismaCode = (err as any).code;
    let message = "Internal database query execution failed";
    let statusCode = 500;

    if (prismaCode === "P2002") {
      const target = (err as any).meta?.target;
      message = target ? `A record with this ${Array.isArray(target) ? target.join(", ") : target} already exists.` : "A record with these details already exists.";
      statusCode = 409;
    } else if (prismaCode === "P2003") {
      message = "Referenced parent or related entity does not exist.";
      statusCode = 400;
    } else if (prismaCode === "P2025") {
      message = "Record not found.";
      statusCode = 404;
    }

    return res.status(statusCode).json({
      success: false,
      error: {
        code: prismaCode || "DATABASE_ERROR",
        message
      }
    });
  }

  log.error({ err }, "Unhandled unexpected exception");
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error"
    }
  });
}
