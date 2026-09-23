import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

process.env.DATABASE_URL = "postgresql://qpset:qpset@localhost:5432/qpset?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret-minimum-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";

const CSRF_COOKIE = "csrf-token=matchedtoken";
const CSRF_HEADER = "matchedtoken";

vi.mock("../src/db.js", () => {
  const mockPrisma = {
    paperForm: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    paperScrutinyReview: {
      create: vi.fn()
    },
    paperItemSnapshot: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    $transaction: vi.fn((input) => {
      if (typeof input === "function") return input(mockPrisma);
      return Promise.all(input);
    })
  };
  return { prisma: mockPrisma };
});

import { prisma } from "../src/db.js";
import { createApp } from "../src/app.js";

const app = createApp();

function getAuthHeader(userId: number, role: string) {
  const token = jwt.sign({ sub: userId, role, username: "test_user" }, process.env.JWT_ACCESS_SECRET as string);
  return `Bearer ${token}`;
}

describe("Anonymous BoE Scrutiny & Scheme of Evaluation API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/v1/scrutiny/papers", () => {
    it("returns list of papers for scrutiny with anonymized summary", async () => {
      (prisma.paperForm.findMany as any).mockResolvedValue([
        {
          id: 1,
          setName: "Set A",
          status: "GENERATED",
          blueprint: {
            title: "SEE Examination: 22CS61",
            examType: "SEE",
            totalMarks: 100,
            courseOffering: {
              course: { courseCode: "22CS61", courseName: "Cloud Computing" },
              department: { name: "CSE" },
              academicYear: "2025-2026"
            }
          },
          reviews: [],
          _count: { snapshots: 10 }
        }
      ]);

      const res = await request(app)
        .get("/api/v1/scrutiny/papers")
        .set("Authorization", getAuthHeader(1, "controller"));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.forms).toHaveLength(1);
      expect(res.body.forms[0].setName).toBe("Set A");
      expect(res.body.forms[0].totalQuestions).toBe(10);
    });
  });

  describe("GET /api/v1/scrutiny/papers/:formId", () => {
    it("masks setter identities deterministically without exposing author names", async () => {
      (prisma.paperForm.findUnique as any).mockResolvedValue({
        id: 1,
        setName: "Set A",
        status: "GENERATED",
        blueprint: {
          title: "SEE Examination: 22CS61",
          examType: "SEE",
          totalMarks: 100,
          durationMinutes: 180,
          instructions: "Answer 5 questions choosing 1 from each module",
          courseOffering: {
            course: { courseCode: "22CS61", courseName: "Cloud Computing", courseOutcomes: [] }
          }
        },
        snapshots: [
          {
            id: 10,
            questionNumber: "Q1",
            moduleNumber: 1,
            isAlternative: false,
            frozenStemJson: { text: "Explain MapReduce architecture" },
            frozenMarks: 20,
            frozenBlooms: "L2",
            frozenCoCode: "CO1",
            frozenRubric: [],
            questionVersion: {
              createdById: 42,
              versionNumber: 1
            }
          }
        ],
        reviews: []
      });

      const res = await request(app)
        .get("/api/v1/scrutiny/papers/1")
        .set("Authorization", getAuthHeader(2, "hod"));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.form.snapshots[0].anonymousSetter).toMatch(/^Setter #[A-F0-9]{4}$/);
      expect(res.body.form.snapshots[0].anonymousSetter).not.toContain("42");
    });
  });

  describe("POST /api/v1/scrutiny/papers/:formId/review", () => {
    it("progresses paper status through scrutiny stages on approval", async () => {
      (prisma.paperForm.findUnique as any).mockResolvedValue({
        id: 1,
        status: "GENERATED"
      });

      (prisma.paperScrutinyReview.create as any).mockResolvedValue({
        id: 101,
        paperFormId: 1,
        reviewerId: 2,
        stage: "PEDAGOGICAL",
        verdict: "APPROVED",
        comments: "Syllabus coverage and Bloom levels are sound"
      });

      (prisma.paperForm.update as any).mockResolvedValue({
        id: 1,
        status: "LINGUISTIC_SCRUTINY"
      });

      const res = await request(app)
        .post("/api/v1/scrutiny/papers/1/review")
        .set("Authorization", getAuthHeader(2, "hod"))
        .set("Cookie", CSRF_COOKIE)
        .set("X-CSRF-Token", CSRF_HEADER)
        .send({
          stage: "PEDAGOGICAL",
          verdict: "APPROVED",
          comments: "Syllabus coverage and Bloom levels are sound",
          checklist: {
            syllabusCovered: true,
            bloomsValid: true,
            noAmbiguity: true,
            marksSumValid: true
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.review.stage).toBe("PEDAGOGICAL");
      expect(prisma.paperForm.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: "LINGUISTIC_SCRUTINY" }
        })
      );
    });
  });

  describe("GET /api/v1/scrutiny/papers/:formId/scheme-of-evaluation", () => {
    it("compiles step-marking scheme of evaluation for evaluators", async () => {
      (prisma.paperForm.findUnique as any).mockResolvedValue({
        id: 1,
        setName: "Set A",
        blueprint: {
          totalMarks: 100,
          courseOffering: {
            course: { courseCode: "22CS61", courseName: "Cloud Computing" }
          }
        },
        snapshots: [
          {
            questionNumber: "Q1",
            moduleNumber: 1,
            isAlternative: false,
            frozenStemJson: { text: "Explain MapReduce" },
            frozenMarks: 20,
            frozenBlooms: "L2",
            frozenCoCode: "CO1",
            frozenRubric: [
              { part: "(a)", rubric: [{ stepNo: 1, description: "Mapper architecture", marks: 5 }] }
            ]
          }
        ]
      });

      const res = await request(app)
        .get("/api/v1/scrutiny/papers/1/scheme-of-evaluation")
        .set("Authorization", getAuthHeader(1, "controller"));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.schemeRows).toHaveLength(1);
      expect(res.body.schemeRows[0].questionNumber).toBe("Q1");
      expect(res.body.schemeRows[0].totalMarks).toBe(20);
      expect(res.body.schemeRows[0].rubricSteps).toHaveLength(1);
    });
  });
});
