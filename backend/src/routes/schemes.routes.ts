import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { recordAuditLog } from "../utils/audit.js";

export const schemesRouter = Router();

const schemeParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const schemeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  semester: z.string().optional(),
  status: z.enum(["Draft", "Finalized"]).optional()
});

const rowSchema = z.object({
  questionNo: z.string().min(1),
  part: z.string().min(1),
  maxMarks: z.number().int().positive(),
  expectedPoints: z.string().min(1),
  co: z.string().min(1),
  bloomsLevel: z.string().min(1)
});

const schemeSchema = z.object({
  courseId: z.number().int(),
  examType: z.string().min(1),
  status: z.enum(["Draft", "Finalized"]).optional(),
  hodId: z.number().int(),
  rows: z.array(rowSchema).default([])
});

schemesRouter.use(requireAuth);

schemesRouter.get("/", validateQuery(schemeQuerySchema), async (req, res) => {
  const { page, limit, sortBy, sortOrder, semester, status } = req.query as any;
  const where: any = req.user!.role === Role.hod ? { hodId: req.user!.sub } : {};

  if (semester) {
    where.course = { semester };
  }
  if (status) where.status = status;

  // Ensure sortBy is valid to prevent injection issues
  const allowedSortFields = ["id", "examType", "status", "createdAt"];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  const [total, schemes] = await prisma.$transaction([
    prisma.scheme.count({ where }),
    prisma.scheme.findMany({
      where,
      include: { rows: true, course: true },
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  res.json({ success: true, data: { items: schemes, total } });
});

schemesRouter.post("/", requireRole(Role.hod), validateBody(schemeSchema), async (req, res) => {
  const { rows, ...data } = req.body;
  const scheme = await prisma.scheme.create({
    data: { ...data, rows: { create: rows } },
    include: { rows: true, course: true }
  });
  res.status(201).json({ success: true, data: scheme });
});

schemesRouter.patch("/:id", requireRole(Role.hod), validateParams(schemeParamsSchema), validateBody(schemeSchema.partial()), async (req, res) => {
  const { rows, ...data } = req.body;
  const scheme = await prisma.scheme.update({
    where: { id: Number(req.params.id) },
    data: {
      ...data,
      ...(rows ? { rows: { deleteMany: {}, create: rows } } : {})
    },
    include: { rows: true, course: true }
  });

  recordAuditLog({
    userId: req.user!.sub,
    role: req.user!.role,
    action: "scheme_modification",
    entityId: String(scheme.id),
    ipAddress: req.ip
  });

  res.json({ success: true, data: scheme });
});
