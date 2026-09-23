import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../db.js";
import { logger } from "../config/logger.js";
import {
  scaleVtuMarks,
  calculateDirectCoAttainment,
  calculatePoAttainment,
  ScalingConfig,
  StudentMarkEntry,
} from "../utils/attainmentEngine.js";
import { generateAccreditationEvidencePack } from "../services/evidencePack.service.js";

export const attainmentRouter = Router();

// ─── Input Validation Schemas ────────────────────────────

const StudentMarkEntrySchema = z.object({
  usn: z.string().min(3),
  studentName: z.string().min(1),
  cieMarks: z.number().min(0),
  seeRawMarks: z.number().min(0),
});

const ScaleMarksRequestSchema = z.object({
  students: z.array(StudentMarkEntrySchema).min(1),
  config: z
    .object({
      maxCieMarks: z.number().positive().optional(),
      maxSeeMarks: z.number().positive().optional(),
      scaledSeeWeight: z.number().positive().optional(),
      minSeePassPercent: z.number().min(0).max(100).optional(),
      minTotalPassPercent: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

const CoDefinitionSchema = z.object({
  coCode: z.string().min(2),
  description: z.string().min(3),
  bloomsLevel: z.string().optional(),
});

const CalculateCoPoSchema = z.object({
  courseId: z.number().optional(),
  targetPercent: z.number().min(1).max(100).default(60),
  cieWeight: z.number().min(0).max(1).default(0.5),
  seeWeight: z.number().min(0).max(1).default(0.5),
  targetThreshold: z.number().min(0).max(3).default(2.4),
  cos: z.array(CoDefinitionSchema).min(1),
  maxMarks: z.object({
    cieMax: z.record(z.string(), z.number().positive()),
    seeMax: z.record(z.string(), z.number().positive()),
  }),
  studentScores: z.array(
    z.object({
      usn: z.string().min(1),
      cieMarks: z.record(z.string(), z.number().min(0)),
      seeMarks: z.record(z.string(), z.number().min(0)),
    })
  ).min(1),
  coPoMatrix: z.record(z.string(), z.record(z.string(), z.number().min(0).max(3))),
});

// ─── Route: VTU CBCS Scaled Marks Calculator ─────────────

attainmentRouter.post(
  "/scale-marks",
  requireAuth,
  requireRole("controller", "hod", "qpsetter"),
  async (req: Request, res: Response) => {
    const parsed = ScaleMarksRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid scaling request data", details: parsed.error.issues });
    }

    const { students, config } = parsed.data;
    const { results, stats } = scaleVtuMarks(students, config as ScalingConfig);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.sub,
        role: req.user?.role,
        action: "VTU_MARKS_SCALED",
        details: `Scaled ${students.length} students. Pass rate: ${stats.passPercentage}%`,
        ipAddress: req.ip || null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Marks scaled successfully according to VTU Autonomous guidelines",
      config: {
        maxCieMarks: config?.maxCieMarks ?? 50,
        maxSeeMarks: config?.maxSeeMarks ?? 100,
        scaledSeeWeight: config?.scaledSeeWeight ?? 50,
        minSeePassPercent: config?.minSeePassPercent ?? 35,
        minTotalPassPercent: config?.minTotalPassPercent ?? 40,
      },
      results,
      stats,
    });
  }
);

// ─── Route: Direct CO & PO-PSO Attainment Calculator ─────

attainmentRouter.post(
  "/calculate-co-po",
  requireAuth,
  requireRole("controller", "hod", "qpsetter"),
  async (req: Request, res: Response) => {
    const parsed = CalculateCoPoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid CO-PO calculation payload", details: parsed.error.issues });
    }

    const {
      cos,
      maxMarks,
      studentScores,
      targetPercent,
      cieWeight,
      seeWeight,
      coPoMatrix,
      targetThreshold,
    } = parsed.data;

    const coAttainments = calculateDirectCoAttainment(cos, maxMarks, studentScores, {
      targetPercent,
      cieWeight,
      seeWeight,
    });

    const poAttainments = calculatePoAttainment(coAttainments, coPoMatrix, targetThreshold);

    return res.status(200).json({
      success: true,
      message: "Direct CO and PO-PSO attainments computed successfully",
      options: {
        targetPercent,
        cieWeight,
        seeWeight,
        targetThreshold,
        totalCohortSize: studentScores.length,
      },
      coAttainments,
      poAttainments,
    });
  }
);

// ─── Route: NBA SAR Criterion 3 & 4 Audit Export ─────────

attainmentRouter.get(
  "/nba-sar-export/:courseId",
  requireAuth,
  requireRole("controller", "hod", "qpsetter"),
  async (req: Request, res: Response) => {
    const courseId = parseInt(req.params.courseId, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ error: "Invalid course ID parameter" });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        department: true,
        courseOutcomes: true,
      },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Default standard COs if not populated yet
    const courseOutcomes =
      course.courseOutcomes.length > 0
        ? course.courseOutcomes.map((co) => ({
            coCode: co.coCode,
            description: co.description,
            targetMarks: co.targetMarks || 60,
          }))
        : [
            { coCode: "CO1", description: `Understand fundamental concepts and principles of ${course.name}`, targetMarks: 60 },
            { coCode: "CO2", description: `Analyze and model real-world engineering systems in ${course.name}`, targetMarks: 60 },
            { coCode: "CO3", description: `Design and evaluate algorithmic solutions compliant with VTU specifications`, targetMarks: 60 },
            { coCode: "CO4", description: `Implement robust architectures and conduct rigorous validation`, targetMarks: 60 },
            { coCode: "CO5", description: `Evaluate contemporary industry standards and performance metrics`, targetMarks: 60 },
          ];

    // Standard NBA CO-PO Matrix for engineering courses
    const defaultCoPoMatrix: Record<string, Record<string, number>> = {
      CO1: { PO1: 3, PO2: 2, PO3: 1, PO4: 1, PO12: 2, PSO1: 3 },
      CO2: { PO1: 3, PO2: 3, PO3: 2, PO4: 2, PO12: 2, PSO1: 3, PSO2: 2 },
      CO3: { PO1: 2, PO2: 3, PO3: 3, PO4: 2, PO5: 2, PO12: 2, PSO1: 2, PSO2: 3 },
      CO4: { PO1: 2, PO2: 2, PO3: 3, PO4: 3, PO5: 3, PO12: 3, PSO1: 2, PSO2: 3 },
      CO5: { PO1: 1, PO2: 2, PO3: 2, PO4: 2, PO6: 2, PO7: 2, PO12: 3, PSO2: 2 },
    };

    const nbaPackage = {
      institution: "AMCEC Autonomous College of Engineering",
      affiliations: "Autonomous Institution Affiliated to VTU, Belagavi | Approved by AICTE, New Delhi",
      accreditation: "NBA Tier-1 Accredited Program (SAR Criteria 3 & 4 Assessment Cycle)",
      academicSession: "2025 - 2026",
      course: {
        id: course.id,
        code: course.code,
        name: course.name,
        semester: course.semester,
        scheme: course.scheme,
        department: course.department?.name || course.dept || "Computer Science and Engineering",
      },
      criterion3: {
        title: "Criterion 3: Course Outcomes (COs) and Program Outcomes (POs)",
        summary: "Assessment of Course Outcome statements, Bloom taxonomy levels, and CO-PO-PSO Articulation Matrix",
        courseOutcomes,
        articulationMatrix: defaultCoPoMatrix,
      },
      criterion4: {
        title: "Criterion 4: Students' Performance & Attainment of Course Outcomes",
        summary: "Direct Attainment methodology incorporating CIE (50%) and SEE (50%) scaled according to VTU regulations",
        evaluationScheme: {
          cieMaxMarks: 50,
          seeMaxMarks: 100,
          seeScaledMarks: 50,
          totalAggregateMarks: 100,
          attainmentTargetPercent: 60,
          attainmentLevelsDefinition: [
            { level: 3, description: ">= 70% students score >= 60% marks in the outcome" },
            { level: 2, description: "60% - 69% students score >= 60% marks in the outcome" },
            { level: 1, description: "50% - 59% students score >= 60% marks in the outcome" },
            { level: 0, description: "< 50% students score >= 60% marks in the outcome" },
          ],
        },
      },
      exportedAt: new Date().toISOString(),
      digitalSignOff: {
        verifiedBy: req.user?.username,
        role: req.user?.role,
        status: "OFFICIALLY_VERIFIED",
      },
    };

    return res.status(200).json({
      success: true,
      nbaPackage,
    });
  }
);

// ─── Route: 18-Part NBA / NAAC Accreditation Evidence Pack ─

attainmentRouter.get(
  "/evidence/pack/:courseOfferingId",
  requireAuth,
  requireRole("controller", "hod", "qpsetter"),
  async (req: Request, res: Response) => {
    const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
    if (isNaN(courseOfferingId)) {
      return res.status(400).json({ error: "Invalid courseOfferingId" });
    }

    const pack = await generateAccreditationEvidencePack(courseOfferingId);
    if (!pack) {
      return res.status(404).json({ error: "Course offering not found" });
    }

    return res.status(200).json({
      success: true,
      evidencePack: pack,
    });
  }
);

