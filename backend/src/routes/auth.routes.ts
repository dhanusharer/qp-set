import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { Role } from "@prisma/client";
import crypto from "crypto";
import { env } from "../config/env.js";
import { prisma } from "../db.js";
import { validateBody } from "../middleware/validate.js";
import { ApiError } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rateLimit.js";
import { recordAuditLog } from "../utils/audit.js";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.nativeEnum(Role)
});

function publicUser(user: Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>) {
  const { passwordHash: _passwordHash, failedAttempts: _failedAttempts, lockoutUntil: _lockoutUntil, ...safe } = user;
  return safe;
}

function accessToken(user: { id: number; role: Role; username: string }) {
  return jwt.sign({ sub: user.id, role: user.role, username: user.username }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"]
  });
}

function refreshToken(user: { id: number; role: Role; username: string }) {
  return jwt.sign({ sub: user.id, role: user.role, username: user.username }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as SignOptions["expiresIn"]
  });
}

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  path: "/"
};

async function recordFailedAttempt(userId: number, currentFailedAttempts: number, log: any) {
  const newAttempts = currentFailedAttempts + 1;
  const data: any = { failedAttempts: newAttempts };
  if (newAttempts >= env.AUTH_MAX_FAILED_ATTEMPTS) {
    data.lockoutUntil = new Date(Date.now() + env.AUTH_LOCKOUT_DURATION_MINS * 60 * 1000);
    log.error({ userId }, "Account locked out due to exceeding max failed login attempts");
  }
  await prisma.user.update({
    where: { id: userId },
    data
  });
}

authRouter.post("/login", authRateLimit, validateBody(loginSchema), async (req, res) => {
  const { username, password, role } = req.body;
  console.log("[AuthDebug] Login request body:", { username, role, passwordLength: password?.length });

  const user = await prisma.user.findUnique({ where: { username } });
  console.log("[AuthDebug] DB User found:", user ? { username: user.username, role: user.role, hash: user.passwordHash } : null);

  // 1. Check account lockout status if user exists
  if (user && user.lockoutUntil && user.lockoutUntil > new Date()) {
    const remainingTime = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
    req.log.warn({ username, role }, "Blocked login attempt: account is locked out");
    throw new ApiError(423, `Too many failed login attempts. Account locked. Please try again in ${remainingTime} minutes.`);
  }

  // 2. Validate user and role
  if (!user || user.role !== role) {
    console.log("[AuthDebug] Validation failed: user exists?", !!user, "user role matches?", user ? user.role === role : false);
    req.log.warn({ username, role }, "Failed login attempt: user not found or role mismatch");
    throw new ApiError(401, "Invalid credentials");
  }

  // 3. Verify password
  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log("[AuthDebug] Password compare result:", ok);
  if (!ok) {
    req.log.warn({ username, role }, "Failed login attempt: invalid password");
    await recordFailedAttempt(user.id, user.failedAttempts, req.log);
    throw new ApiError(401, "Invalid credentials");
  }

  // 4. Reset lockout counter on success
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockoutUntil: null }
  });

  // 5. Create refresh token and rotate family
  const refresh = refreshToken(user);
  const hash = crypto.createHash("sha256").update(refresh).digest("hex");
  const familyId = crypto.randomUUID();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      familyId,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  // 6. Generate CSRF token
  const csrfToken = crypto.randomBytes(32).toString("hex");

  req.log.info({ userId: user.id, username, role }, "User logged in successfully");

  recordAuditLog({
    userId: user.id,
    role: user.role,
    action: "login",
    ipAddress: req.ip
  });

  // 7. Set cookies
  res.clearCookie("refreshToken", { ...cookieOptions, path: "/" }); // Clean legacy root cookie

  res.cookie("accessToken", accessToken(user), {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  res.cookie("refreshToken", refresh, {
    ...cookieOptions,
    path: "/api/v1/auth/refresh", // scope refresh to the rotation endpoint only
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.cookie("csrf-token", csrfToken, {
    ...cookieOptions,
    httpOnly: false, // readable by frontend JS for X-CSRF-Token headers
    maxAge: 7 * 24 * 60 * 60 * 1000 // Match refresh token duration
  });

  res.json({
    success: true,
    data: {
      user: publicUser(user),
      csrfToken
    }
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });
  const csrfToken = req.cookies["csrf-token"] || crypto.randomUUID();
  
  res.cookie("csrf-token", csrfToken, {
    ...cookieOptions,
    httpOnly: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    data: {
      user: publicUser(user),
      csrfToken
    }
  });
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  const incomingToken = req.cookies?.refreshToken;

  if (incomingToken) {
    const hash = crypto.createHash("sha256").update(incomingToken).digest("hex");
    const dbToken = await prisma.refreshToken.findFirst({ where: { tokenHash: hash } });
    if (dbToken) {
      // Revoke the entire refresh token family on logout
      await prisma.refreshToken.updateMany({
        where: { familyId: dbToken.familyId },
        data: { revoked: true }
      });
    }
  }

  req.log.info({ userId: req.user!.sub }, "User logged out successfully, cleared active refresh tokens");

  recordAuditLog({
    userId: req.user!.sub,
    role: req.user!.role,
    action: "logout",
    ipAddress: req.ip
  });

  // Clear all auth cookies
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", { ...cookieOptions, path: "/api/v1/auth/refresh" });
  res.clearCookie("refreshToken", { ...cookieOptions, path: "/" }); // Clean legacy root cookie on logout
  res.clearCookie("csrf-token", cookieOptions);

  res.status(204).end();
});

authRouter.post("/refresh", authRateLimit, async (req, res) => {
  const incomingToken = req.cookies?.refreshToken;
  if (!incomingToken) {
    req.log.warn("Refresh request missing refresh token cookie");
    throw new ApiError(401, "Invalid refresh token");
  }

  // 1. Verify token signature
  let payload: any;
  try {
    payload = jwt.verify(incomingToken, env.JWT_REFRESH_SECRET);
  } catch (err: any) {
    req.log.warn({ err: err.message }, "Invalid refresh token: JWT verification failed");
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const userId = payload.sub;
  const hash = crypto.createHash("sha256").update(incomingToken).digest("hex");

  // 2. Query database for token status
  const dbToken = await prisma.refreshToken.findFirst({
    where: { tokenHash: hash }
  });

  if (!dbToken) {
    req.log.warn({ userId }, "Failed token refresh: no matching token hash in DB");
    throw new ApiError(401, "Invalid refresh token");
  }

  // 3. Detect Replay Attack (token is revoked)
  if (dbToken.revoked) {
    req.log.error({ userId, familyId: dbToken.familyId }, "Compromised refresh token used (replay attack)! Revoking all tokens in family.");
    
    // Revoke all remaining active tokens in the same family
    await prisma.refreshToken.updateMany({
      where: { familyId: dbToken.familyId },
      data: { revoked: true }
    });

    // Clear client cookies
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", { ...cookieOptions, path: "/api/v1/auth/refresh" });
    res.clearCookie("csrf-token", cookieOptions);

    throw new ApiError(403, "Compromised session. All tokens revoked. Please log in again.");
  }

  // 4. Validate expiration
  if (new Date(dbToken.expiresAt) < new Date()) {
    req.log.warn({ userId, tokenId: dbToken.id }, "Failed token refresh: refresh token expired");
    throw new ApiError(401, "Expired refresh token");
  }

  // 5. Rotate tokens
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const newAccess = accessToken(user);
  const newRefresh = refreshToken(user);
  const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");

  await prisma.$transaction(async (tx) => {
    // Revoke the current rotated token
    await tx.refreshToken.update({
      where: { id: dbToken.id },
      data: { revoked: true, replacedBy: newHash }
    });

    // Create the rotated token under same family
    await tx.refreshToken.create({
      data: {
        userId: user.id,
        familyId: dbToken.familyId,
        tokenHash: newHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  });

  req.log.info({ userId: user.id }, "Refresh token rotated successfully");

  // 6. Set rotated cookies
  res.cookie("accessToken", newAccess, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  res.cookie("refreshToken", newRefresh, {
    ...cookieOptions,
    path: "/api/v1/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    success: true,
    data: {
      user: publicUser(user)
    }
  });
});

