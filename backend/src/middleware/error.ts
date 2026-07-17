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
  if (err instanceof Error && err.constructor.name.startsWith("PrismaClient")) {
    log.error({ err }, "Database query execution failure");
    return res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Internal database query execution failed"
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
