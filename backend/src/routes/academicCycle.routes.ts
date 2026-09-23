import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { AcademicCycleService } from "../services/academicCycle.service.js";

export const academicCycleRouter = Router();

const CreateAcademicYearSchema = z.object({
  code: z.string().min(4),
  name: z.string().min(4),
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean().optional(),
});

const CreateExamSessionSchema = z.object({
  academicTermId: z.number().int(),
  assessmentTypeId: z.number().int(),
  regulationProfileId: z.number().int().optional(),
  code: z.string().min(3),
  name: z.string().min(3),
  startDate: z.string(),
  endDate: z.string(),
});

const UpdateSessionStatusSchema = z.object({
  status: z.enum(["PLANNING", "ACTIVE", "SCRUTINY", "SEALED", "CONCLUDED", "CANCELLED"]),
});

const SessionWizardSchema = z.object({
  courseIds: z.array(z.number().int()).min(1),
  blueprintTemplateId: z.number().int().optional(),
  paperTemplateId: z.number().int().optional(),
  setsToGenerate: z.array(z.string()).optional(),
});

const RegisterCandidatesSchema = z.object({
  candidates: z.array(
    z.object({
      studentUsn: z.string().min(3),
      studentName: z.string().min(2),
      candidateType: z.enum(["REGULAR", "BACKLOG", "MAKEUP", "GRADE_IMPROVEMENT"]).optional(),
      cohortYear: z.string().optional(),
      eligible: z.boolean().optional(),
      remarks: z.string().optional(),
    })
  ).min(1),
});

// ─── Academic Years ──────────────────────────────────────────────────────────

academicCycleRouter.get("/years", requireAuth, async (req: Request, res: Response) => {
  const years = await AcademicCycleService.listAcademicYears();
  res.json({ success: true, data: years });
});

academicCycleRouter.post(
  "/years",
  requireAuth,
  requireRole("admin", "controller"),
  async (req: Request, res: Response) => {
    const parsed = CreateAcademicYearSchema.parse(req.body);
    const year = await AcademicCycleService.createAcademicYear(parsed);
    res.status(201).json({ success: true, data: year });
  }
);

// ─── Academic Terms ──────────────────────────────────────────────────────────

academicCycleRouter.get("/terms", requireAuth, async (req: Request, res: Response) => {
  const yearId = req.query.academicYearId ? parseInt(req.query.academicYearId as string) : undefined;
  const terms = await AcademicCycleService.listAcademicTerms(yearId);
  res.json({ success: true, data: terms });
});

// ─── Assessment Types ────────────────────────────────────────────────────────

academicCycleRouter.get("/assessment-types", requireAuth, async (req: Request, res: Response) => {
  const types = await AcademicCycleService.listAssessmentTypes();
  res.json({ success: true, data: types });
});

// ─── Curriculum Versions ─────────────────────────────────────────────────────

academicCycleRouter.get("/curriculum-versions", requireAuth, async (req: Request, res: Response) => {
  const versions = await AcademicCycleService.listCurriculumVersions();
  res.json({ success: true, data: versions });
});

// ─── Exam Sessions ───────────────────────────────────────────────────────────

academicCycleRouter.get("/sessions", requireAuth, async (req: Request, res: Response) => {
  const filters = {
    academicTermId: req.query.academicTermId ? parseInt(req.query.academicTermId as string) : undefined,
    status: req.query.status as string | undefined,
    assessmentTypeId: req.query.assessmentTypeId ? parseInt(req.query.assessmentTypeId as string) : undefined,
  };
  const sessions = await AcademicCycleService.listExamSessions(filters);
  res.json({ success: true, data: sessions });
});

academicCycleRouter.post(
  "/sessions",
  requireAuth,
  requireRole("admin", "controller"),
  async (req: Request, res: Response) => {
    const parsed = CreateExamSessionSchema.parse(req.body);
    const session = await AcademicCycleService.createExamSession(parsed);
    res.status(201).json({ success: true, data: session });
  }
);

academicCycleRouter.get("/sessions/:sessionId", requireAuth, async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId);
  const session = await AcademicCycleService.getExamSessionDetails(sessionId);
  res.json({ success: true, data: session });
});

academicCycleRouter.patch(
  "/sessions/:sessionId/status",
  requireAuth,
  requireRole("admin", "controller"),
  async (req: Request, res: Response) => {
    const sessionId = parseInt(req.params.sessionId);
    const parsed = UpdateSessionStatusSchema.parse(req.body);
    const updated = await AcademicCycleService.updateExamSessionStatus(sessionId, parsed.status);
    res.json({ success: true, data: updated });
  }
);

academicCycleRouter.post(
  "/sessions/:sessionId/wizard",
  requireAuth,
  requireRole("admin", "controller"),
  async (req: Request, res: Response) => {
    const sessionId = parseInt(req.params.sessionId);
    const parsed = SessionWizardSchema.parse(req.body);
    const result = await AcademicCycleService.generateSessionEventsWizard(sessionId, parsed);
    res.json({ success: true, data: result });
  }
);

// ─── Assessment Events ───────────────────────────────────────────────────────

academicCycleRouter.get("/events/:eventId", requireAuth, async (req: Request, res: Response) => {
  const eventId = parseInt(req.params.eventId);
  const event = await AcademicCycleService.getAssessmentEventDetails(eventId);
  res.json({ success: true, data: event });
});

academicCycleRouter.post(
  "/events/:eventId/candidates",
  requireAuth,
  requireRole("admin", "controller", "dean"),
  async (req: Request, res: Response) => {
    const eventId = parseInt(req.params.eventId);
    const parsed = RegisterCandidatesSchema.parse(req.body);
    const result = await AcademicCycleService.registerCandidates(eventId, parsed.candidates);
    res.json({ success: true, data: result });
  }
);

// ─── Historical Course Matrix ────────────────────────────────────────────────

academicCycleRouter.get(
  "/historical/courses/:courseId",
  requireAuth,
  async (req: Request, res: Response) => {
    const courseId = parseInt(req.params.courseId);
    const matrix = await AcademicCycleService.getHistoricalCourseMatrix(courseId);
    res.json({ success: true, data: matrix });
  }
);
