import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../db.js";
import { calculateItemPsychometrics } from "../services/psychometrics.service.js";
import { evaluateQuestionHealth } from "../services/questionHealth.service.js";
import { evaluateItemExposure, DEFAULT_EXPOSURE_POLICY } from "../services/exposurePolicy.service.js";

export const psychometricsRouter = Router();

// ─── Input Validation Schemas ────────────────────────────

const RecordPerformanceSchema = z.object({
  maxItemMarks: z.number().positive(),
  academicYear: z.string().default("2025-2026"),
  semester: z.string().default("6"),
  assessmentType: z.string().default("SEE"),
  paperFormId: z.number().optional(),
  responses: z.array(
    z.object({
      studentUsn: z.string().min(1),
      itemScore: z.number().min(0),
      totalScore: z.number().min(0),
    })
  ).min(1),
});

// ─── Route: Get Question Psychometrics & Health ──────────

psychometricsRouter.get(
  "/questions/:id",
  requireAuth,
  requireRole("controller", "hod", "qpsetter"),
  async (req: Request, res: Response) => {
    const questionId = parseInt(req.params.id, 10);
    if (isNaN(questionId)) {
      return res.status(400).json({ error: "Invalid question ID" });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        psychometric: true,
        usages: { orderBy: { usedAt: "desc" } },
        similaritiesAsSource: { where: { resolution: "PENDING_REVIEW" } },
        similaritiesAsTarget: { where: { resolution: "PENDING_REVIEW" } },
        course: { select: { code: true, name: true } },
      },
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const pendingDuplicateCount =
      question.similaritiesAsSource.length + question.similaritiesAsTarget.length;

    // Evaluate health state dynamically
    const health = evaluateQuestionHealth({
      sampleSize: question.psychometric?.sampleSize ?? 0,
      difficultyIndex: question.psychometric?.difficultyIndex ?? 0.5,
      discriminationIndex: question.psychometric?.discriminationIndex ?? 0.3,
      timesUsed: question.usages.length,
      recentUsesCount: question.usages.length,
      hasUnresolvedDuplicateFlag: pendingDuplicateCount > 0,
      isRetired: question.status === "RETIRED",
    });

    return res.status(200).json({
      success: true,
      questionId: question.id,
      code: question.code,
      course: question.course,
      status: question.status,
      psychometrics: question.psychometric,
      health,
      usages: question.usages,
      pendingDuplicateFlagsCount: pendingDuplicateCount,
    });
  }
);

// ─── Route: Record Cohort Exam Performance ───────────────

psychometricsRouter.post(
  "/questions/:id/record-exam-performance",
  requireAuth,
  requireRole("controller", "hod"),
  async (req: Request, res: Response) => {
    const questionId = parseInt(req.params.id, 10);
    if (isNaN(questionId)) {
      return res.status(400).json({ error: "Invalid question ID" });
    }

    const parsed = RecordPerformanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid performance payload", details: parsed.error.issues });
    }

    const { maxItemMarks, academicYear, semester, assessmentType, paperFormId, responses } = parsed.data;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { usages: true },
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // 1. Calculate CTT psychometrics
    const psych = calculateItemPsychometrics(responses, maxItemMarks);

    // 2. Evaluate health
    const health = evaluateQuestionHealth({
      sampleSize: psych.sampleSize,
      difficultyIndex: psych.difficultyIndex,
      discriminationIndex: psych.discriminationIndex,
      timesUsed: question.usages.length + 1,
      recentUsesCount: question.usages.length + 1,
      hasUnresolvedDuplicateFlag: false,
      isRetired: question.status === "RETIRED",
    });

    // 3. Atomically upsert psychometrics record and create usage entry
    const [savedPsych, usage] = await prisma.$transaction([
      prisma.questionPsychometric.upsert({
        where: { questionId },
        update: {
          difficultyIndex: psych.difficultyIndex,
          discriminationIndex: psych.discriminationIndex,
          pointBiserial: psych.pointBiserial,
          sampleSize: psych.sampleSize,
          averageScore: psych.averageScore,
          healthStatus: health.status,
          healthExplanation: health.explanation,
          timesUsed: { increment: 1 },
          lastUsedAt: new Date(),
          lastCalculatedAt: new Date(),
        },
        create: {
          questionId,
          difficultyIndex: psych.difficultyIndex,
          discriminationIndex: psych.discriminationIndex,
          pointBiserial: psych.pointBiserial,
          sampleSize: psych.sampleSize,
          averageScore: psych.averageScore,
          healthStatus: health.status,
          healthExplanation: health.explanation,
          timesUsed: 1,
          lastUsedAt: new Date(),
        },
      }),
      prisma.questionUsage.create({
        data: {
          questionId,
          paperFormId: paperFormId ?? null,
          academicYear,
          semester,
          assessmentType,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Psychometrics calculated and recorded successfully",
      psychometrics: savedPsych,
      health,
      usage,
    });
  }
);

// ─── Route: Evaluate Item Exposure Policies ──────────────

psychometricsRouter.post(
  "/exposure/evaluate",
  requireAuth,
  requireRole("controller", "hod", "qpsetter"),
  async (req: Request, res: Response) => {
    const questionIdsSchema = z.object({
      questionIds: z.array(z.number()).min(1),
    });

    const parsed = questionIdsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid question IDs array" });
    }

    const { questionIds } = parsed.data;

    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: {
        usages: { orderBy: { usedAt: "desc" } },
        psychometric: true,
      },
    });

    const candidates = questions.map((q) => {
      const timesUsed = q.usages.length;
      return {
        questionId: q.id,
        questionCode: q.code,
        status: q.status,
        timesUsed,
        recentExamUses: timesUsed,
        sessionsSinceLastUse: timesUsed > 0 ? 2 : null,
        healthStatus: q.psychometric?.healthStatus,
      };
    });

    const evaluations = evaluateItemExposure(candidates, DEFAULT_EXPOSURE_POLICY);

    return res.status(200).json({
      success: true,
      policy: DEFAULT_EXPOSURE_POLICY,
      evaluations,
    });
  }
);
