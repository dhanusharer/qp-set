import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../db.js";

export const regulationRouter = Router();

const RegulationProfileSchema = z.object({
  code: z.string().min(3),
  name: z.string().min(3),
  academicYear: z.string().min(4),
  programme: z.string().default("B.Tech / B.E."),
  cieWeight: z.number().min(0).max(1).default(0.5),
  seeWeight: z.number().min(0).max(1).default(0.5),
  numModules: z.number().int().min(1).max(10).default(5),
  marksPerModule: z.number().int().min(5).max(100).default(20),
  totalMarks: z.number().int().default(100),
  scaledTotalMarks: z.number().int().default(100),
  minSeePassPercent: z.number().min(0).max(100).default(35.0),
  minTotalPassPercent: z.number().min(0).max(100).default(40.0),
  rulesJson: z.any().optional(),
  isActive: z.boolean().default(true),
});

// Default VTU Autonomous 2022 Scheme Profile Data
export const DEFAULT_VTU_REGULATION = {
  code: "VTU_ENGG_2022",
  name: "VTU Autonomous Engineering Regulations (2022 Scheme)",
  academicYear: "2022",
  programme: "B.Tech / B.E. (All Engineering Disciplines)",
  cieWeight: 0.5,
  seeWeight: 0.5,
  numModules: 5,
  marksPerModule: 20,
  totalMarks: 100,
  scaledTotalMarks: 100,
  minSeePassPercent: 35.0,
  minTotalPassPercent: 40.0,
  isActive: true,
  rulesJson: {
    choicePattern: "COMPULSORY_OR_CHOICE_PER_MODULE",
    instructions: "Answer five full questions, choosing one full question from each module.",
    gradingScale: [
      { grade: "O", min: 90, points: 10 },
      { grade: "A+", min: 80, points: 9 },
      { grade: "A", min: 70, points: 8 },
      { grade: "B+", min: 60, points: 7 },
      { grade: "B", min: 55, points: 6 },
      { grade: "C", min: 50, points: 5 },
      { grade: "P", min: 40, points: 4 },
      { grade: "F", min: 0, points: 0 },
    ],
  },
};

// ─── Route: List all Regulation Profiles ─────────────────

regulationRouter.get(
  "/",
  requireAuth,
  requireRole("controller", "hod", "qpsetter"),
  async (_req: Request, res: Response) => {
    let profiles = await prisma.regulationProfile.findMany({
      include: {
        _count: { select: { blueprints: true, rules: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Auto-seed default VTU profile if empty
    if (profiles.length === 0) {
      const defaultProfile = await prisma.regulationProfile.create({
        data: DEFAULT_VTU_REGULATION,
        include: {
          _count: { select: { blueprints: true, rules: true } },
        },
      });
      profiles = [defaultProfile];
    }

    return res.status(200).json({
      success: true,
      profiles,
    });
  }
);

// ─── Route: Get Active or Specific Profile ───────────────

regulationRouter.get(
  "/:id",
  requireAuth,
  requireRole("controller", "hod", "qpsetter"),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid regulation profile ID" });
    }

    const profile = await prisma.regulationProfile.findUnique({
      where: { id },
      include: {
        rules: true,
        _count: { select: { blueprints: true } },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: "Regulation profile not found" });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  }
);

// ─── Route: Create or Clone Regulation Profile ───────────

regulationRouter.post(
  "/",
  requireAuth,
  requireRole("controller"),
  async (req: Request, res: Response) => {
    const parsed = RegulationProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid regulation profile data", details: parsed.error.issues });
    }

    const data = parsed.data;

    const existing = await prisma.regulationProfile.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return res.status(409).json({ error: `Regulation code '${data.code}' already exists` });
    }

    const created = await prisma.regulationProfile.create({
      data,
    });

    return res.status(201).json({
      success: true,
      message: "Regulation profile created successfully",
      profile: created,
    });
  }
);

// ─── Route: Update Regulation Profile ────────────────────

regulationRouter.put(
  "/:id",
  requireAuth,
  requireRole("controller"),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid profile ID" });
    }

    const parsed = RegulationProfileSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid update payload", details: parsed.error.issues });
    }

    const updated = await prisma.regulationProfile.update({
      where: { id },
      data: parsed.data,
    });

    return res.status(200).json({
      success: true,
      message: "Regulation profile updated successfully",
      profile: updated,
    });
  }
);
