import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";

export const coursesRouter = Router();

const courseParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const courseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  sortBy: z.string().default("courseName"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  semester: z.string().optional()
});

const courseSchema = z.object({
  courseName: z.string().min(1),
  courseCode: z.string().min(1),
  semester: z.string().min(1),
  schemeYear: z.string().min(1),
  credits: z.number().int().positive(),
  examTypes: z.array(z.string().min(1)).min(1),
  syllabusFileName: z.string().optional(),
  bos: z.string().min(1),
  hodId: z.number().int()
});

coursesRouter.use(requireAuth);

coursesRouter.get("/", validateQuery(courseQuerySchema), async (req, res) => {
  const { page, limit, sortBy, sortOrder, search, semester } = req.query as any;
  const where: any = req.user!.role === Role.hod ? { hodId: req.user!.sub } : {};

  if (semester) where.semester = semester;
  if (search) {
    where.OR = [
      { courseName: { contains: search, mode: "insensitive" } },
      { courseCode: { contains: search, mode: "insensitive" } }
    ];
  }

  // Ensure sortBy is valid to prevent injection issues
  const allowedSortFields = ["id", "courseName", "courseCode", "semester", "schemeYear", "credits"];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "courseName";

  const [total, courses] = await prisma.$transaction([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  res.json({ success: true, data: { items: courses, total } });
});

coursesRouter.post("/", requireRole(Role.controller, Role.hod), validateBody(courseSchema), async (req, res) => {
  const course = await prisma.course.create({ data: req.body });
  res.status(201).json({ success: true, data: course });
});

coursesRouter.patch("/:id", requireRole(Role.controller, Role.hod), validateParams(courseParamsSchema), validateBody(courseSchema.partial()), async (req, res) => {
  const course = await prisma.course.update({ where: { id: Number(req.params.id) }, data: req.body });
  res.json({ success: true, data: course });
});

coursesRouter.delete("/:id", requireRole(Role.controller, Role.hod), validateParams(courseParamsSchema), async (req, res) => {
  await prisma.course.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});
