import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { recordAuditLog } from "../utils/audit.js";

export const assessmentsRouter = Router();

const createAssessmentSchema = z.object({
  examType: z.string().min(1),
  semester: z.string().min(1),
  startDate: z.coerce.date(),
  schemeYear: z.string().optional()
});

assessmentsRouter.use(requireAuth);

// List all assessments
assessmentsRouter.get("/", async (req, res) => {
  const assessments = await prisma.assessment.findMany({
    orderBy: { startDate: "desc" }
  });
  res.json({ success: true, data: assessments });
});

// Create assessment master record
assessmentsRouter.post("/", requireRole(Role.controller), validateBody(createAssessmentSchema), async (req, res) => {
  const { examType, semester, startDate, schemeYear } = req.body;

  // Generate unique assessmentCode
  const dateObj = new Date(startDate);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  let typeAbbrev = "IA";
  if (examType.includes("1")) typeAbbrev = "1IA";
  else if (examType.includes("2")) typeAbbrev = "2IA";
  else if (examType.includes("3")) typeAbbrev = "3IA";
  else if (examType.toLowerCase().includes("end") || examType.toLowerCase().includes("ese") || examType.toLowerCase().includes("100")) {
    typeAbbrev = "ESE";
  }

  const schemeAbbrev = schemeYear ? schemeYear.replace(/\s+/g, "").replace("Scheme", "") : "";
  const assessmentCode = schemeAbbrev
    ? `${typeAbbrev}_${semester}Sem_${schemeAbbrev}_${month}${year}`
    : `${typeAbbrev}_${semester}Sem_${month}${year}`;

  // Check if assessmentCode already exists
  const existing = await prisma.assessment.findUnique({
    where: { assessmentCode }
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      error: { message: `Assessment ID ${assessmentCode} already exists for this cycle.` }
    });
  }

  const assessment = await prisma.assessment.create({
    data: {
      assessmentCode,
      examType,
      semester,
      startDate,
      schemeYear
    }
  });

  recordAuditLog({
    userId: req.user!.sub,
    role: req.user!.role,
    action: "assessment_creation",
    entityId: String(assessment.id),
    ipAddress: req.ip
  });

  res.status(201).json({ success: true, data: assessment });
});
