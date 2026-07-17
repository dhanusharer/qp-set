import type { Request, Response, NextFunction } from "express";
import { ApiError } from "./error.js";

const EXCLUDED_PATHS = ["/api/v1/auth/login", "/health/live", "/health/ready", "/health/metrics", "/docs"];

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // 1. Skip non-state-changing methods
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 2. Skip excluded paths
  const isExcluded = EXCLUDED_PATHS.some((path) => req.originalUrl.startsWith(path));
  if (isExcluded) {
    return next();
  }

  // 3. Extract CSRF token from cookie and header
  const cookieToken = req.cookies?.["csrf-token"];
  const headerToken = req.header("x-csrf-token") || req.header("X-CSRF-Token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    req.log?.warn({ cookieTokenExists: !!cookieToken, headerTokenExists: !!headerToken }, "CSRF token validation failed");
    throw new ApiError(403, "CSRF validation failed: Token mismatch or missing");
  }

  next();
}
