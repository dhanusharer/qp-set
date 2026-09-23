import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import crypto from "crypto";

export const scrutinyRouter = Router();
scrutinyRouter.use(requireAuth);

// Helper function to mask setter identity deterministically per paper form
function maskSetterId(authorId: number, formId: number): string {
  const hash = crypto.createHmac("sha256", `boe-mask-salt-${formId}`)
    .update(authorId.toString())
    .digest("hex")
    .substring(0, 4)
    .toUpperCase();
  return `Setter #${hash}`;
}

const scrutinyReviewSchema = z.object({
  stage: z.enum(["PEDAGOGICAL", "LINGUISTIC", "COE_APPROVAL"]),
  verdict: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
  comments: z.string().min(3),
  checklist: z.object({
    syllabusCovered: z.boolean().default(true),
    bloomsValid: z.boolean().default(true),
    noAmbiguity: z.boolean().default(true),
    marksSumValid: z.boolean().default(true)
  }).optional()
});

const patchSnapshotSchema = z.object({
  frozenStemText: z.string().min(3),
  reason: z.string().min(3)
});

// ─── 1. List Papers for Anonymous Scrutiny ────────────────

scrutinyRouter.get("/papers", async (_req, res) => {
  const forms = await prisma.paperForm.findMany({
    include: {
      blueprint: {
        include: {
          courseOffering: {
            include: { course: true, department: true }
          }
        }
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 3
      },
      _count: { select: { snapshots: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  // Return papers with anonymized status summary
  const anonymizedForms = forms.map((f) => ({
    id: f.id,
    setName: f.setName,
    status: f.status,
    totalQuestions: f._count.snapshots,
    blueprintTitle: f.blueprint.title,
    examType: f.blueprint.examType,
    totalMarks: f.blueprint.totalMarks,
    courseCode: f.blueprint.courseOffering?.course?.courseCode,
    courseName: f.blueprint.courseOffering?.course?.courseName,
    department: f.blueprint.courseOffering?.department?.name || "Engineering",
    academicYear: f.blueprint.courseOffering?.academicYear,
    latestReviews: f.reviews.map((r) => ({
      stage: r.stage,
      verdict: r.verdict,
      createdAt: r.createdAt
    }))
  }));

  res.json({ success: true, forms: anonymizedForms });
});

// ─── 2. Get Single Paper with Complete Setter Identity Masking

scrutinyRouter.get("/papers/:formId", async (req, res) => {
  const formId = parseInt(req.params.formId, 10);
  const form = await prisma.paperForm.findUnique({
    where: { id: formId },
    include: {
      blueprint: {
        include: {
          courseOffering: {
            include: { course: { include: { courseOutcomes: true } } }
          }
        }
      },
      snapshots: {
        orderBy: { orderIndex: "asc" },
        include: {
          questionVersion: {
            select: {
              createdById: true,
              versionNumber: true
            }
          }
        }
      },
      reviews: {
        orderBy: { createdAt: "asc" },
        include: {
          reviewer: { select: { id: true, name: true, role: true } }
        }
      }
    }
  });

  if (!form) {
    return res.status(404).json({ error: "Paper form not found" });
  }

  // Anonymize each item: replace author with masked ID and omit author contact
  const maskedSnapshots = form.snapshots.map((snap) => {
    const rawAuthorId = snap.questionVersion?.createdById || 999;
    const maskedSetter = maskSetterId(rawAuthorId, formId);

    return {
      id: snap.id,
      questionNumber: snap.questionNumber,
      moduleNumber: snap.moduleNumber,
      isAlternative: snap.isAlternative,
      frozenStemJson: snap.frozenStemJson,
      frozenMarks: snap.frozenMarks,
      frozenBlooms: snap.frozenBlooms,
      frozenCoCode: snap.frozenCoCode,
      frozenRubric: snap.frozenRubric,
      anonymousSetter: maskedSetter,
      versionNumber: snap.questionVersion?.versionNumber || 1
    };
  });

  res.json({
    success: true,
    form: {
      id: form.id,
      setName: form.setName,
      status: form.status,
      blueprint: {
        title: form.blueprint.title,
        examType: form.blueprint.examType,
        totalMarks: form.blueprint.totalMarks,
        durationMinutes: form.blueprint.durationMinutes,
        instructions: form.blueprint.instructions,
        courseCode: form.blueprint.courseOffering?.course?.courseCode,
        courseName: form.blueprint.courseOffering?.course?.courseName,
        courseOutcomes: form.blueprint.courseOffering?.course?.courseOutcomes || []
      },
      snapshots: maskedSnapshots,
      reviews: form.reviews
    }
  });
});

// ─── 3. Submit Scrutiny Review Verdict (3-Stage Protocol) ─

scrutinyRouter.post("/papers/:formId/review", validateBody(scrutinyReviewSchema), async (req, res) => {
  const formId = parseInt(req.params.formId, 10);
  const { stage, verdict, comments, checklist } = req.body;
  const reviewerId = req.user!.sub;

  const form = await prisma.paperForm.findUnique({ where: { id: formId } });
  if (!form) {
    return res.status(404).json({ error: "Paper form not found" });
  }

  const review = await prisma.$transaction(async (tx) => {
    const rev = await tx.paperScrutinyReview.create({
      data: {
        paperFormId: formId,
        reviewerId,
        stage,
        verdict,
        comments,
        checklist: checklist || null
      }
    });

    // Compute state progression across 3 stages
    let nextStatus = form.status;
    if (verdict === "APPROVED") {
      if (stage === "PEDAGOGICAL") nextStatus = "LINGUISTIC_SCRUTINY";
      else if (stage === "LINGUISTIC") nextStatus = "BOE_APPROVED";
      else if (stage === "COE_APPROVAL") nextStatus = "APPROVED";
    } else if (verdict === "CHANGES_REQUESTED") {
      nextStatus = "REVISION_REQUIRED";
    } else if (verdict === "REJECTED") {
      nextStatus = "REJECTED";
    }

    await tx.paperForm.update({
      where: { id: formId },
      data: { status: nextStatus }
    });

    return rev;
  });

  res.status(201).json({ success: true, review });
});

// ─── 4. Minor Typographical Edit by BoE ───────────────────

scrutinyRouter.patch("/snapshots/:snapshotId", validateBody(patchSnapshotSchema), async (req, res) => {
  const snapshotId = parseInt(req.params.snapshotId, 10);
  const { frozenStemText, reason } = req.body;

  const snapshot = await prisma.paperItemSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot) {
    return res.status(404).json({ error: "Snapshot not found" });
  }

  const currentStem: any = typeof snapshot.frozenStemJson === "object" ? snapshot.frozenStemJson : {};
  const updatedStem = {
    ...currentStem,
    text: frozenStemText,
    boeCorrectionReason: reason,
    correctedAt: new Date().toISOString(),
    correctedByUserId: req.user!.sub
  };

  const updated = await prisma.paperItemSnapshot.update({
    where: { id: snapshotId },
    data: { frozenStemJson: updatedStem }
  });

  res.json({ success: true, snapshot: updated });
});

// ─── 5. Granular Step-Marking Scheme of Evaluation ────────

scrutinyRouter.get("/papers/:formId/scheme-of-evaluation", async (req, res) => {
  const formId = parseInt(req.params.formId, 10);
  const form = await prisma.paperForm.findUnique({
    where: { id: formId },
    include: {
      blueprint: {
        include: {
          courseOffering: { include: { course: true } }
        }
      },
      snapshots: {
        orderBy: { orderIndex: "asc" }
      }
    }
  });

  if (!form) {
    return res.status(404).json({ error: "Paper form not found" });
  }

  const schemeRows: any[] = [];

  for (const snap of form.snapshots) {
    const rubrics = Array.isArray(snap.frozenRubric) ? snap.frozenRubric : [];
    schemeRows.push({
      questionNumber: snap.questionNumber,
      moduleNumber: snap.moduleNumber,
      isAlternative: snap.isAlternative,
      questionText: (snap.frozenStemJson as any)?.text || snap.frozenStemJson,
      totalMarks: snap.frozenMarks,
      bloomsLevel: snap.frozenBlooms,
      coCode: snap.frozenCoCode,
      rubricSteps: rubrics
    });
  }

  res.json({
    success: true,
    formId,
    setName: form.setName,
    courseCode: form.blueprint?.courseOffering?.course?.courseCode,
    courseName: form.blueprint?.courseOffering?.course?.courseName,
    totalMarks: form.blueprint?.totalMarks,
    schemeRows
  });
});
