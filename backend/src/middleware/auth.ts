import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { ApiError } from "./error.js";

export interface AuthUser {
  sub: number;
  role: Role;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  let token = req.cookies?.accessToken;

  if (!token) {
    const header = req.header("authorization");
    token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  }

  if (!token) throw new ApiError(401, "Missing access token");

  try {
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AuthUser;
    next();
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    console.log("[AuthMiddleware] requireRole check:", {
      userRole: req.user?.role,
      permittedRoles: roles,
      includes: req.user ? roles.includes(req.user.role) : false
    });
    if (!req.user) throw new ApiError(401, "Authentication required");
    if (!roles.includes(req.user.role)) throw new ApiError(403, "Insufficient role");
    next();
  };
}
