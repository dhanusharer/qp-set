import { Router } from "express";
import { z } from "zod";
import { Role, QuestionStatus, BloomsLevel } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { encryptPayload, decryptPayload, generateBlindIndex } from "../utils/cryptoVault.js";

export const bankRouter = Router();
bankRouter.use(requireAuth);

// ─── Zod Schemas ──────────────────────────────────────────

const departmentSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(2).max(150),
  hodId: z.number().int().positive().optional()
});

const courseOutcomeSchema = z.object({
  coCode: z.string().min(2).max(10), // e.g. "CO1"
  description: z.string().min(5),
  targetMarks: z.number().int().positive().optional()
});

const bulkCourseOutcomeSchema = z.object({
  outcomes: z.array(courseOutcomeSchema).min(1)
});

const courseOfferingSchema = z.object({
  academicYear: z.string().min(4), // e.g. "2025-2026"
  semester: z.string().min(1),     // e.g. "6"
  schemeYear: z.string().min(4),   // e.g. "2022"
  departmentId: z.number().int().positive().optional()
});

const questionPartSchema = z.object({
  partLabel: z.string().min(1).max(10), // e.g. "(a)", "(b)", "(c)"
  marks: z.number().int().positive(),
  bloomsLevel: z.nativeEnum(BloomsLevel),
  courseOutcomeId: z.number().int().positive().optional(),
  coCode: z.string().optional(),
  markingRubric: z.any().optional(),   // Array of { stepNo, description, marks }
  modelAnswerJson: z.any().optional()  // Rich text / LaTeX solution
});

const createQuestionSchema = z.object({
  courseId: z.number().int().positive(),
  unitNumber: z.number().int().min(1).max(5),
  topic: z.string().min(2),
  subtopic: z.string().optional(),
  stemRichJson: z.any(),
  plainText: z.string().min(3),
  parts: z.array(questionPartSchema).min(1),
  status: z.nativeEnum(QuestionStatus).optional().default(QuestionStatus.DRAFT)
});

const createVersionSchema = z.object({
  stemRichJson: z.any(),
  plainText: z.string().min(3),
  parts: z.array(questionPartSchema).min(1),
  changeLog: z.string().optional()
});

const reviewSchema = z.object({
  stage: z.enum(["PEDAGOGICAL", "LINGUISTIC", "BOE_FINAL"]),
  verdict: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
  comments: z.string().min(3)
});

const statusSchema = z.object({
  status: z.nativeEnum(QuestionStatus)
});

// ─── 1. Academic Spine Endpoints ──────────────────────────

// List all departments
bankRouter.get("/departments", async (_req, res) => {
  const departments = await prisma.department.findMany({
    include: {
      hod: { select: { id: true, name: true, email: true } },
      _count: { select: { courses: true, users: true } }
    },
    orderBy: { code: "asc" }
  });
  res.json({ success: true, departments });
});

// Create or update department (Controller / HOD)
bankRouter.post("/departments", requireRole(Role.controller), validateBody(departmentSchema), async (req, res) => {
  const { code, name, hodId } = req.body;
  const department = await prisma.department.upsert({
    where: { code },
    update: { name, hodId },
    create: { code, name, hodId }
  });
  res.status(201).json({ success: true, department });
});

// Get Course Outcomes for a course
bankRouter.get("/courses/:courseId/outcomes", async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const outcomes = await prisma.courseOutcome.findMany({
    where: { courseId },
    orderBy: { coCode: "asc" }
  });
  res.json({ success: true, outcomes });
});

// Bulk set Course Outcomes for a course
bankRouter.post("/courses/:courseId/outcomes", requireRole(Role.controller, Role.hod), validateBody(bulkCourseOutcomeSchema), async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const { outcomes } = req.body;

  const result = await prisma.$transaction(
    outcomes.map(outcome =>
      prisma.courseOutcome.upsert({
        where: { courseId_coCode: { courseId, coCode: outcome.coCode } },
        update: { description: outcome.description, targetMarks: outcome.targetMarks },
        create: { courseId, coCode: outcome.coCode, description: outcome.description, targetMarks: outcome.targetMarks }
      })
    )
  );

  res.json({ success: true, outcomes: result });
});

// Get Course Offerings
bankRouter.get("/courses/:courseId/offerings", async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const offerings = await prisma.courseOffering.findMany({
    where: { courseId },
    include: { department: true },
    orderBy: [{ academicYear: "desc" }, { semester: "desc" }]
  });
  res.json({ success: true, offerings });
});

// Create Course Offering
bankRouter.post("/courses/:courseId/offerings", requireRole(Role.controller, Role.hod), validateBody(courseOfferingSchema), async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const { academicYear, semester, schemeYear, departmentId } = req.body;

  const offering = await prisma.courseOffering.upsert({
    where: {
      courseId_academicYear_semester_schemeYear: {
        courseId,
        academicYear,
        semester,
        schemeYear
      }
    },
    update: { departmentId },
    create: { courseId, academicYear, semester, schemeYear, departmentId }
  });

  res.status(201).json({ success: true, offering });
});

// ─── 2. Question Bank Core Endpoints ──────────────────────

// List questions with filters
bankRouter.get("/questions", async (req, res) => {
  const { courseId, unitNumber, bloomsLevel, coCode, status, search, page = "1", limit = "20" } = req.query as any;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const where: any = {};
  if (courseId) where.courseId = parseInt(courseId, 10);
  if (unitNumber) where.unitNumber = parseInt(unitNumber, 10);
  if (status) where.status = status;

  if (search) {
    const blindIndex = generateBlindIndex(search);
    where.OR = [
      { topic: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { versions: { some: { contentBlindIndex: blindIndex } } }
    ];
  }

  // Filter by sub-part attributes (Bloom's level or CO)
  if (bloomsLevel || coCode) {
    where.versions = {
      some: {
        parts: {
          some: {
            ...(bloomsLevel ? { bloomsLevel } : {}),
            ...(coCode ? { coCode } : {})
          }
        }
      }
    };
  }

  const [total, questions] = await prisma.$transaction([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        course: { select: { courseCode: true, courseName: true, semester: true } },
        author: { select: { id: true, name: true, email: true, dept: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            parts: {
              orderBy: { orderIndex: "asc" }
            }
          }
        },
        reviews: {
          take: 3,
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  // Decrypt content for response
  const decryptedQuestions = questions.map(q => {
    const latestVersion = q.versions[0];
    let decryptedContent = latestVersion?.stemRichJson;

    if (latestVersion?.encryptedContent && latestVersion?.iv && latestVersion?.authTag) {
      try {
        decryptedContent = decryptPayload({
          ciphertext: latestVersion.encryptedContent,
          iv: latestVersion.iv,
          authTag: latestVersion.authTag
        });
      } catch (err) {
        // Fall back to stemRichJson if already stored as json
        decryptedContent = latestVersion.stemRichJson;
      }
    }

    return {
      ...q,
      latestVersion: latestVersion ? {
        ...latestVersion,
        stemRichJson: decryptedContent,
        encryptedContent: undefined, // mask ciphertext in public payload
        iv: undefined,
        authTag: undefined
      } : null
    };
  });

  res.json({
    success: true,
    total,
    page: pageNum,
    limit: limitNum,
    questions: decryptedQuestions
  });
});

// Get single question by ID with full version history and reviews
bankRouter.get("/questions/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      course: true,
      author: { select: { id: true, name: true, email: true, dept: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          parts: { orderBy: { orderIndex: "asc" } },
          createdBy: { select: { id: true, name: true } }
        }
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          reviewer: { select: { id: true, name: true, role: true } }
        }
      }
    }
  });

  if (!question) {
    return res.status(404).json({ error: "Question not found" });
  }

  // Decrypt each version
  const decryptedVersions = question.versions.map(v => {
    let content = v.stemRichJson;
    if (v.encryptedContent && v.iv && v.authTag) {
      try {
        content = decryptPayload({
          ciphertext: v.encryptedContent,
          iv: v.iv,
          authTag: v.authTag
        });
      } catch {
        content = v.stemRichJson;
      }
    }
    return {
      ...v,
      stemRichJson: content,
      encryptedContent: undefined,
      iv: undefined,
      authTag: undefined
    };
  });

  res.json({
    success: true,
    question: {
      ...question,
      versions: decryptedVersions
    }
  });
});

// Create new Question
bankRouter.post("/questions", validateBody(createQuestionSchema), async (req, res) => {
  const { courseId, unitNumber, topic, subtopic, stemRichJson, plainText, parts, status } = req.body;
  const authorId = req.user!.sub;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  // Generate unique Question Code
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const code = `Q-${course.courseCode}-U${unitNumber}-${Date.now().toString().slice(-4)}${randomSuffix}`;

  // Cryptographic Vault AES-256-GCM encryption
  const encrypted = encryptPayload(stemRichJson);
  const blindIndex = generateBlindIndex(plainText);

  const question = await prisma.$transaction(async (tx) => {
    const q = await tx.question.create({
      data: {
        code,
        courseId,
        unitNumber,
        topic,
        subtopic,
        status: status || QuestionStatus.DRAFT,
        authorId,
        currentVersionNo: 1
      }
    });

    const v = await tx.questionVersion.create({
      data: {
        questionId: q.id,
        versionNumber: 1,
        stemRichJson,
        plainText,
        contentBlindIndex: blindIndex,
        encryptedContent: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        createdById: authorId,
        changeLog: "Initial authoring"
      }
    });

    await tx.questionPart.createMany({
      data: parts.map((part: any, index: number) => ({
        questionVersionId: v.id,
        partLabel: part.partLabel,
        marks: part.marks,
        bloomsLevel: part.bloomsLevel,
        courseOutcomeId: part.courseOutcomeId,
        coCode: part.coCode,
        markingRubric: part.markingRubric || null,
        modelAnswerJson: part.modelAnswerJson || null,
        orderIndex: index
      }))
    });

    return q;
  });

  res.status(201).json({ success: true, questionId: question.id, code });
});

// Create new Version of existing Question
bankRouter.post("/questions/:id/version", validateBody(createVersionSchema), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { stemRichJson, plainText, parts, changeLog } = req.body;
  const authorId = req.user!.sub;

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    return res.status(404).json({ error: "Question not found" });
  }

  const nextVersionNo = question.currentVersionNo + 1;
  const encrypted = encryptPayload(stemRichJson);
  const blindIndex = generateBlindIndex(plainText);

  await prisma.$transaction(async (tx) => {
    await tx.question.update({
      where: { id },
      data: { currentVersionNo: nextVersionNo, status: QuestionStatus.DRAFT }
    });

    const v = await tx.questionVersion.create({
      data: {
        questionId: id,
        versionNumber: nextVersionNo,
        stemRichJson,
        plainText,
        contentBlindIndex: blindIndex,
        encryptedContent: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        createdById: authorId,
        changeLog: changeLog || `Version ${nextVersionNo}`
      }
    });

    await tx.questionPart.createMany({
      data: parts.map((part: any, index: number) => ({
        questionVersionId: v.id,
        partLabel: part.partLabel,
        marks: part.marks,
        bloomsLevel: part.bloomsLevel,
        courseOutcomeId: part.courseOutcomeId,
        coCode: part.coCode,
        markingRubric: part.markingRubric || null,
        modelAnswerJson: part.modelAnswerJson || null,
        orderIndex: index
      }))
    });
  });

  res.json({ success: true, versionNumber: nextVersionNo });
});

// Update Question Status
bankRouter.patch("/questions/:id/status", validateBody(statusSchema), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  const question = await prisma.question.update({
    where: { id },
    data: { status }
  });

  res.json({ success: true, question });
});

// Submit Review for Question (BoE / Peer Review)
bankRouter.post("/questions/:id/reviews", validateBody(reviewSchema), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { stage, verdict, comments } = req.body;
  const reviewerId = req.user!.sub;

  const review = await prisma.$transaction(async (tx) => {
    const rev = await tx.questionReview.create({
      data: {
        questionId: id,
        reviewerId,
        stage,
        verdict,
        comments
      }
    });

    // Auto update status if final stage
    if (stage === "BOE_FINAL" || stage === "PEDAGOGICAL") {
      let newStatus: QuestionStatus = QuestionStatus.PENDING_REVIEW;
      if (verdict === "APPROVED") newStatus = QuestionStatus.APPROVED;
      if (verdict === "CHANGES_REQUESTED") newStatus = QuestionStatus.REVISION_REQUESTED;
      if (verdict === "REJECTED") newStatus = QuestionStatus.RETIRED;

      await tx.question.update({
        where: { id },
        data: { status: newStatus }
      });
    }

    return rev;
  });

  res.status(201).json({ success: true, review });
});

// ─── 3. Question Bank OBE Analytics ───────────────────────

bankRouter.get("/courses/:courseId/analytics", async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { courseOutcomes: true }
  });

  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  // Fetch all questions for this course with current version and parts
  const questions = await prisma.question.findMany({
    where: { courseId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { parts: true }
      }
    }
  });

  // Coverage statistics
  const unitDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const bloomsDistribution: Record<string, number> = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0 };
  const coDistribution: Record<string, number> = {};
  const statusDistribution: Record<string, number> = {
    DRAFT: 0,
    SUBMITTED: 0,
    PENDING_REVIEW: 0,
    APPROVED: 0,
    REVISION_REQUESTED: 0,
    RETIRED: 0
  };

  let totalMarks = 0;

  for (const q of questions) {
    if (unitDistribution[q.unitNumber] !== undefined) {
      unitDistribution[q.unitNumber]++;
    }
    statusDistribution[q.status] = (statusDistribution[q.status] || 0) + 1;

    const latest = q.versions[0];
    if (latest?.parts) {
      for (const p of latest.parts) {
        totalMarks += p.marks;
        bloomsDistribution[p.bloomsLevel] = (bloomsDistribution[p.bloomsLevel] || 0) + p.marks;
        if (p.coCode) {
          coDistribution[p.coCode] = (coDistribution[p.coCode] || 0) + p.marks;
        }
      }
    }
  }

  res.json({
    success: true,
    courseId,
    courseCode: course.courseCode,
    totalQuestions: questions.length,
    totalMarksCapacity: totalMarks,
    unitDistribution,
    bloomsDistribution,
    coDistribution,
    statusDistribution,
    courseOutcomes: course.courseOutcomes
  });
});
