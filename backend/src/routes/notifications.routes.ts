import { Router } from "express";
import { z } from "zod";
import { Role, NotificationType, NotificationKind } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";

export const notificationsRouter = Router();

const notificationParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  sortBy: z.string().default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  read: z.preprocess((val) => val === "true" ? true : val === "false" ? false : undefined, z.boolean()).optional()
});

const notificationSchema = z.object({
  userId: z.number().int(),
  message: z.string().min(1),
  date: z.coerce.date().optional(),
  read: z.boolean().optional(),
  type: z.nativeEnum(NotificationType).optional(),
  kind: z.nativeEnum(NotificationKind).optional(),
  assignmentId: z.number().int().optional(),
  fromUserId: z.number().int().optional()
});

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", validateQuery(notificationQuerySchema), async (req, res) => {
  const { page, limit, sortBy, sortOrder, read } = req.query as any;
  const where: any = { userId: req.user!.sub };

  if (read !== undefined) where.read = read;

  // Ensure sortBy is valid to prevent injection issues
  const allowedSortFields = ["id", "date", "read", "type", "kind"];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "date";

  const [total, notifications] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      include: {
        fromUser: { select: { id: true, name: true, role: true } }
      },
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  res.json({ success: true, data: { items: notifications, total } });
});

notificationsRouter.post("/", requireRole(Role.controller, Role.hod, Role.qpsetter), validateBody(notificationSchema), async (req, res) => {
  const notification = await prisma.notification.create({
    data: req.body,
    include: {
      fromUser: { select: { id: true, name: true, role: true } }
    }
  });
  res.status(201).json({ success: true, data: notification });
});

notificationsRouter.patch("/:id/read", validateParams(notificationParamsSchema), async (req, res) => {
  const notification = await prisma.notification.update({
    where: { id: Number(req.params.id) },
    data: { read: true }
  });
  res.json({ success: true, data: notification });
});
