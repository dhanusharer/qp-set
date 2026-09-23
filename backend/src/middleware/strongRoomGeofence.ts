import { Request, Response, NextFunction } from "express";
import { prisma } from "../db.js";

/**
 * Strong Room Geofencing & Perimeter Validation Middleware:
 * Protects paper unsealing, printing, and secret share injection.
 * Validates that requests originate strictly from authorized physical examination Strong Room terminals.
 */

export function requireStrongRoomPerimeter(req: Request, res: Response, next: NextFunction) {
  const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();
  const terminalToken = req.headers["x-strong-room-terminal-token"] as string;

  // Local development & loopback are authorized
  const isLoopback = clientIp === "127.0.0.1" || clientIp === "::1" || clientIp === "::ffff:127.0.0.1" || clientIp === "localhost";

  // Configured Strong Room static IP list or subnet
  const allowedIpsEnv = process.env.STRONG_ROOM_IPS || "";
  const allowedIps = allowedIpsEnv ? allowedIpsEnv.split(",").map((ip) => ip.trim()) : [];

  const isWhitelistedIp = isLoopback || allowedIps.includes(clientIp);
  const isValidTerminalToken = terminalToken === (process.env.STRONG_ROOM_TERMINAL_TOKEN || "AMCEC-STRONGROOM-SECURE-TERMINAL-2026");

  if (!isWhitelistedIp && !isValidTerminalToken) {
    // Log unauthorized perimeter breach to AuditLog
    prisma.auditLog.create({
      data: {
        userId: req.user?.sub,
        role: req.user?.role,
        action: "UNAUTHORIZED_STRONG_ROOM_ACCESS_ATTEMPT",
        details: `Perimeter check failed. Origin IP: ${clientIp}`,
        ipAddress: clientIp
      }
    }).catch(() => {});

    return res.status(403).json({
      error: "Strong Room Physical Perimeter Check Failed",
      message: "Access denied: Request must originate from an authorized examination Strong Room terminal."
    });
  }

  next();
}
