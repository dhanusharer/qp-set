import { Role } from "@prisma/client";
import { prisma } from "../db.js";
import { logger } from "../config/logger.js";

export function recordAuditLog(data: {
  userId?: number;
  role?: Role;
  action: string;
  entityId?: string;
  ipAddress?: string;
}) {
  prisma.auditLog.create({ data })
    .catch((err) => {
      logger.error({ err, data }, "Failed to write audit log to database");
    });
}
