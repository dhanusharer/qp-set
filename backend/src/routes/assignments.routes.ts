import { Router } from "express";
import { z } from "zod";
import { Role, AssignmentStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireAssignmentOwnership } from "../middleware/ownership.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { fromDbStatus, toDbStatus } from "../utils/status.js";
import { recordAuditLog } from "../utils/audit.js";
import { sendRealtimeNotification } from "../notifications/websocket.js";

export const assignmentsRouter = Router();

const assignmentParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const assignmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  sortBy: z.string().default("assignedDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.nativeEnum(AssignmentStatus).optional(),
  search: z.string().optional()
});

const assignmentSchema = z.object({
  assessmentCode: z.string().optional(),
  assessmentId: z.number().int().optional(),
  description: z.string().optional(),
  facultyId: z.number().int().optional().nullable(),
  hodId: z.number().int().optional(),
  courseId: z.number().int(),
  examType: z.string().min(1),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date(),
  status: z.enum(["Pending", "Submitted", "Approved", "Revision Required"]).optional(),
  assignedDate: z.coerce.date(),
  instructions: z.string().optional(),
  revisionComment: z.string().optional(),
  syllabusFileName: z.string().optional(),
  prevPaperFileName: z.string().optional(),
  timetableFileName: z.string().optional(),
  assignedById: z.number().int().optional()
});

const suggestionSchema = z.object({
  fromUserId: z.number().int(),
  message: z.string().min(1)
});

// Include course relation in all assignment queries for subject info
const assignmentInclude = {
  suggestions: { include: { fromUser: { select: { id: true, name: true, role: true } } } },
  paper: true,
  course: { select: { id: true, courseName: true, courseCode: true, semester: true, schemeYear: true } },
  assignedBy: { select: { id: true, name: true, role: true } },
  assessment: true
};

function mapAssignment(a: any) {
  return { ...a, status: fromDbStatus(a.status) };
}

assignmentsRouter.use(requireAuth);

assignmentsRouter.get("/", validateQuery(assignmentQuerySchema), async (req, res) => {
  const { page, limit, sortBy, sortOrder, status, search } = req.query as any;

  const where: any =
    req.user!.role === Role.qpsetter
      ? { facultyId: req.user!.sub }
      : req.user!.role === Role.hod
        ? { hodId: req.user!.sub }
        : {};

  if (status) where.status = status;
  if (search) {
    where.OR = [
      { course: { courseName: { contains: search, mode: "insensitive" } } },
      { course: { courseCode: { contains: search, mode: "insensitive" } } },
      { assessmentCode: { contains: search, mode: "insensitive" } }
    ];
  }

  // Ensure sortBy is valid to prevent injection issues
  const allowedSortFields = ["id", "assessmentCode", "examType", "assignedDate", "dueDate", "status"];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "assignedDate";

  const [total, assignments] = await prisma.$transaction([
    prisma.assignment.count({ where }),
    prisma.assignment.findMany({
      where,
      include: assignmentInclude,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  res.json({ success: true, data: { items: assignments.map(mapAssignment), total } });
});

assignmentsRouter.post("/", requireRole(Role.controller, Role.hod), validateBody(assignmentSchema), async (req, res) => {
  const { status, assignedById, assessmentId, ...data } = req.body;

  let finalCode = data.assessmentCode || "";
  if (assessmentId) {
    const masterObj = await prisma.assessment.findUnique({ where: { id: assessmentId } });
    const courseObj = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (masterObj && courseObj) {
      finalCode = `${masterObj.assessmentCode}_${courseObj.courseCode}`;
    }
  }

  const assignment = await prisma.assignment.create({
    data: {
      ...data,
      assessmentCode: finalCode,
      assessmentId,
      status: toDbStatus(status) ?? "Pending",
      assignedById: assignedById ?? req.user!.sub
    },
    include: assignmentInclude
  });

  recordAuditLog({
    userId: req.user!.sub,
    role: req.user!.role,
    action: "assignment_creation",
    entityId: String(assignment.id),
    ipAddress: req.ip
  });

  sendRealtimeNotification(
    (client) => client.userId === assignment.facultyId,
    { type: "NOTIFICATION_RECEIVED", data: { message: `New assignment created: ${assignment.course.courseName}` } }
  );

  res.status(201).json({ success: true, data: mapAssignment(assignment) });
});

assignmentsRouter.patch("/:id", requireRole(Role.controller, Role.hod), validateParams(assignmentParamsSchema), requireAssignmentOwnership, validateBody(assignmentSchema.partial()), async (req, res) => {
  const id = Number(req.params.id);
  const { status, ...data } = req.body;
  const assignment = await prisma.assignment.update({
    where: { id },
    data: { ...data, status: toDbStatus(status) },
    include: assignmentInclude
  });

  recordAuditLog({
    userId: req.user!.sub,
    role: req.user!.role,
    action: (status === "Approved" || status === "RevisionRequired") ? "approval_actions" : "assignment_modification",
    entityId: String(assignment.id),
    ipAddress: req.ip
  });

  if (status === "Approved") {
    sendRealtimeNotification(
      (client) => client.role === "controller",
      { type: "NOTIFICATION_RECEIVED", data: { message: `Question paper approved for subject: ${assignment.course.courseName}` } }
    );
  }

  res.json({ success: true, data: mapAssignment(assignment) });
});

assignmentsRouter.post("/:id/suggestions", requireRole(Role.controller, Role.hod), validateParams(assignmentParamsSchema), requireAssignmentOwnership, validateBody(suggestionSchema), async (req, res) => {
  const suggestion = await prisma.suggestion.create({
    data: { ...req.body, assignmentId: Number(req.params.id) },
    include: { fromUser: { select: { id: true, name: true, role: true } } }
  });
  res.status(201).json({ success: true, data: suggestion });
});

assignmentsRouter.put("/:id/paper", requireRole(Role.qpsetter, Role.hod), validateParams(assignmentParamsSchema), requireAssignmentOwnership, validateBody(z.object({ content: z.unknown(), submit: z.boolean().optional() })), async (req, res) => {
  const id = Number(req.params.id);

  const { paperRecord, assignment } = await prisma.$transaction(async (tx) => {
    const paperVal = await tx.questionPaper.upsert({
      where: { assignmentId: id },
      create: {
        assignmentId: id,
        content: req.body.content,
        submittedAt: req.body.submit ? new Date() : null
      },
      update: {
        content: req.body.content,
        submittedAt: req.body.submit ? new Date() : undefined
      }
    });

    let assignmentVal = await tx.assignment.findUnique({ where: { id }, include: { course: true } });
    if (req.body.submit && assignmentVal) {
      assignmentVal = await tx.assignment.update({ where: { id }, data: { status: "Submitted" }, include: { course: true } });
    }

    return { paperRecord: paperVal, assignment: assignmentVal };
  });

  recordAuditLog({
    userId: req.user!.sub,
    role: req.user!.role,
    action: "assignment_modification",
    entityId: String(id),
    ipAddress: req.ip
  });

  if (req.body.submit && assignment && assignment.hodId) {
    sendRealtimeNotification(
      (client) => client.userId === assignment.hodId,
      { type: "NOTIFICATION_RECEIVED", data: { message: `Question paper submitted for subject: ${assignment.course.courseName}` } }
    );
  }

  res.json({ success: true, data: paperRecord });
});
