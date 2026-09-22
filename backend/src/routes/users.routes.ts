import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Affiliation, Role } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { recordAuditLog } from "../utils/audit.js";

export const usersRouter = Router();

const listSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  hodId: z.coerce.number().int().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  sortBy: z.string().default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional()
});

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  name: z.string().min(1),
  title: z.string().optional().nullable(),
  dept: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")).transform(v => v || undefined),
  phone: z.string().optional().nullable().or(z.literal("")).transform(v => v || undefined),
  qualification: z.string().optional().nullable().transform(v => v || undefined),
  experience: z.string().optional().nullable().transform(v => v || undefined),
  joinDate: z.coerce.date().optional().nullable(),
  designation: z.string().optional().nullable().transform(v => v || undefined),
  hodId: z.coerce.number().int().optional().nullable().transform(v => v || undefined),
  affiliation: z.nativeEnum(Affiliation).optional().nullable(),
  college: z.string().optional().nullable().transform(v => v || undefined),
  registeredBy: z.string().optional().nullable().transform(v => v || undefined),
  registeredOn: z.coerce.date().optional().nullable()
});

usersRouter.use(requireAuth);

usersRouter.get("/", validateQuery(listSchema), async (req, res) => {
  const { role, hodId, page, limit, sortBy, sortOrder, search } = req.query as any;

  const where: any = {};
  if (role) where.role = role;
  if (hodId) where.hodId = hodId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } }
    ];
  }

  // Ensure sortBy is a valid field to sort by to prevent raw injection issues
  const allowedSortFields = ["id", "name", "username", "role", "email"];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "name";

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        title: true,
        dept: true,
        email: true,
        phone: true,
        qualification: true,
        experience: true,
        joinDate: true,
        designation: true,
        hodId: true,
        affiliation: true,
        college: true,
        registeredBy: true,
        registeredOn: true
      }
    })
  ]);

  res.json({ success: true, data: { items: users, total } });
});

usersRouter.post("/", requireRole(Role.controller, Role.hod), validateBody(createUserSchema), async (req, res) => {
  const { password, ...data } = req.body;

  if (req.user!.role === Role.hod) {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!actor || actor.role !== Role.hod) {
      return res.status(403).json({ success: false, error: { message: "Access denied" } });
    }
    if (data.role !== Role.qpsetter) {
      return res.status(403).json({ success: false, error: { message: "HODs can only create QP Setter roles" } });
    }
    // Force department and HOD coordinator mappings to HOD's own values
    data.dept = actor.dept;
    data.hodId = actor.id;
  } else if (data.hodId) {
    // If controller passed a hodId, ensure it actually exists
    const hodExists = await prisma.user.findUnique({ where: { id: data.hodId } });
    if (!hodExists || hodExists.role !== Role.hod) {
      // Try to find an HOD by department if available
      if (data.dept) {
        const deptHod = await prisma.user.findFirst({
          where: {
            role: Role.hod,
            OR: [
              { dept: data.dept },
              { dept: { contains: data.dept, mode: "insensitive" } }
            ]
          }
        });
        data.hodId = deptHod ? deptHod.id : null;
      } else {
        data.hodId = null;
      }
    }
  } else if (data.dept) {
    // Auto-link to HOD of the department if found
    const deptHod = await prisma.user.findFirst({
      where: {
        role: Role.hod,
        OR: [
          { dept: data.dept },
          { dept: { contains: data.dept, mode: "insensitive" } }
        ]
      }
    });
    if (deptHod) {
      data.hodId = deptHod.id;
    }
  }

  // Ensure username uniqueness (auto-resolve conflict with suffix if needed)
  let candidateUsername = data.username.toLowerCase().trim();
  let existingUser = await prisma.user.findUnique({ where: { username: candidateUsername } });
  let counter = 1;
  while (existingUser) {
    candidateUsername = `${data.username.toLowerCase().trim()}${counter}`;
    existingUser = await prisma.user.findUnique({ where: { username: candidateUsername } });
    counter++;
  }
  data.username = candidateUsername;

  // Check email uniqueness if email provided
  if (data.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      return res.status(409).json({ success: false, error: { message: `Email ${data.email} is already registered.` } });
    }
  }

  // Clean empty/undefined values
  Object.keys(data).forEach(key => {
    if (data[key] === "" || data[key] === undefined) {
      delete data[key];
    }
  });

  const user = await prisma.user.create({
    data: { ...data, passwordHash: await bcrypt.hash(password, env.BCRYPT_ROUNDS) },
    select: { id: true, username: true, role: true, name: true, email: true, hodId: true, dept: true, designation: true }
  });

  recordAuditLog({
    userId: req.user!.sub,
    role: req.user!.role,
    action: "user_creation",
    entityId: String(user.id),
    ipAddress: req.ip
  });

  res.status(201).json({ success: true, data: user });
});

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).optional(),
  title: z.string().optional().nullable(),
  dept: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")).transform(v => v || undefined),
  phone: z.string().optional().nullable().or(z.literal("")).transform(v => v || undefined),
  qualification: z.string().optional().nullable().transform(v => v || undefined),
  experience: z.string().optional().nullable().transform(v => v || undefined),
  designation: z.string().optional().nullable().transform(v => v || undefined),
  affiliation: z.nativeEnum(Affiliation).optional().nullable(),
  college: z.string().optional().nullable().transform(v => v || undefined)
});

const userParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

usersRouter.patch("/:id", requireRole(Role.controller, Role.hod), validateParams(userParamsSchema), validateBody(updateUserSchema), async (req, res) => {
  const targetId = Number(req.params.id);
  const { password, ...data } = req.body;
  const updateData: any = { ...data };

  if (req.user!.role === Role.hod) {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });

    if (!actor || !targetUser || targetUser.role !== Role.qpsetter || targetUser.dept !== actor.dept) {
      return res.status(403).json({ success: false, error: { message: "Access denied: You can only modify faculty in your department" } });
    }

    // Prevent HOD from escalating role or changing department
    delete updateData.role;
    delete updateData.dept;
  }

  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data: updateData,
    select: {
      id: true, username: true, role: true, name: true, title: true,
      dept: true, email: true,
      phone: true, designation: true, hodId: true, affiliation: true, college: true
    }
  });

  recordAuditLog({
    userId: req.user!.sub,
    role: req.user!.role,
    action: "user_update",
    entityId: String(user.id),
    ipAddress: req.ip
  });

  res.json({ success: true, data: user });
});

usersRouter.delete("/:id", requireRole(Role.controller, Role.hod), validateParams(userParamsSchema), async (req, res) => {
  const targetId = Number(req.params.id);

  if (req.user!.role === Role.hod) {
    const actor = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });

    if (!actor || !targetUser || targetUser.role !== Role.qpsetter || targetUser.dept !== actor.dept) {
      return res.status(403).json({ success: false, error: { message: "Access denied: You can only delete faculty in your department" } });
    }
  }

  await prisma.user.delete({ where: { id: targetId } });

  recordAuditLog({
    userId: req.user!.sub,
    role: req.user!.role,
    action: "user_deletion",
    entityId: String(targetId),
    ipAddress: req.ip
  });

  res.status(204).end();
});
