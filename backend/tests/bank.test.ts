import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

// Set environment variables for tests
process.env.DATABASE_URL = "postgresql://qpset:qpset@localhost:5432/qpset?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret-minimum-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";

// Mock Prisma with bank models
vi.mock("../src/db.js", () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    course: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    department: {
      findMany: vi.fn(),
      upsert: vi.fn()
    },
    courseOutcome: {
      findMany: vi.fn(),
      upsert: vi.fn()
    },
    courseOffering: {
      findMany: vi.fn(),
      upsert: vi.fn()
    },
    question: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    questionVersion: {
      create: vi.fn()
    },
    questionPart: {
      createMany: vi.fn()
    },
    questionReview: {
      create: vi.fn()
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

const CSRF_COOKIE = "csrf-token=matchedtoken";
const CSRF_HEADER = "matchedtoken";

describe("Question Bank & Academic Spine API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/v1/bank/departments", () => {
    it("returns list of departments", async () => {
      (prisma.department.findMany as any).mockResolvedValue([
        { id: 1, code: "CSE", name: "Computer Science", _count: { courses: 12, users: 20 } }
      ]);

      const res = await request(app)
        .get("/api/v1/bank/departments")
        .set("Authorization", getAuthHeader(1, "controller"));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.departments).toHaveLength(1);
      expect(res.body.departments[0].code).toBe("CSE");
    });
  });

  describe("POST /api/v1/bank/departments", () => {
    it("allows controller to create department", async () => {
      (prisma.department.upsert as any).mockResolvedValue({
        id: 1,
        code: "AIML",
        name: "Artificial Intelligence & Machine Learning"
      });

      const res = await request(app)
        .post("/api/v1/bank/departments")
        .set("Authorization", getAuthHeader(1, "controller"))
        .set("Cookie", CSRF_COOKIE)
        .set("X-CSRF-Token", CSRF_HEADER)
        .send({ code: "AIML", name: "Artificial Intelligence & Machine Learning" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.department.code).toBe("AIML");
    });

    it("forbids non-controller from creating department", async () => {
      const res = await request(app)
        .post("/api/v1/bank/departments")
        .set("Authorization", getAuthHeader(2, "qpsetter"))
        .set("Cookie", CSRF_COOKIE)
        .set("X-CSRF-Token", CSRF_HEADER)
        .send({ code: "AIML", name: "Artificial Intelligence & Machine Learning" });

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/bank/courses/:courseId/outcomes", () => {
    it("allows HOD to bulk configure Course Outcomes", async () => {
      (prisma.courseOutcome.upsert as any).mockResolvedValue({
        id: 10,
        courseId: 1,
        coCode: "CO1",
        description: "Apply graph theory algorithms to network routing",
        targetMarks: 20
      });

      const res = await request(app)
        .post("/api/v1/bank/courses/1/outcomes")
        .set("Authorization", getAuthHeader(2, "hod"))
        .set("Cookie", CSRF_COOKIE)
        .set("X-CSRF-Token", CSRF_HEADER)
        .send({
          outcomes: [
            { coCode: "CO1", description: "Apply graph theory algorithms to network routing", targetMarks: 20 },
            { coCode: "CO2", description: "Design dynamic programming solutions for optimization", targetMarks: 20 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.outcomes).toHaveLength(2);
    });
  });

  describe("POST /api/v1/bank/questions", () => {
    it("creates question with AES-256-GCM encryption and blind index", async () => {
      (prisma.course.findUnique as any).mockResolvedValue({
        id: 1,
        courseCode: "22CS61",
        courseName: "Cloud Computing"
      });

      (prisma.question.create as any).mockResolvedValue({
        id: 101,
        code: "Q-22CS61-U1-12345678",
        courseId: 1,
        unitNumber: 1,
        topic: "Virtualization Architecture",
        status: "DRAFT",
        authorId: 3,
        currentVersionNo: 1
      });

      (prisma.questionVersion.create as any).mockResolvedValue({
        id: 501,
        questionId: 101,
        versionNumber: 1
      });

      (prisma.questionPart.createMany as any).mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post("/api/v1/bank/questions")
        .set("Authorization", getAuthHeader(3, "qpsetter"))
        .set("Cookie", CSRF_COOKIE)
        .set("X-CSRF-Token", CSRF_HEADER)
        .send({
          courseId: 1,
          unitNumber: 1,
          topic: "Virtualization Architecture",
          stemRichJson: { type: "doc", content: [{ type: "paragraph", text: "Explain hypervisor types" }] },
          plainText: "Explain Type-1 and Type-2 hypervisors with architectural diagrams",
          parts: [
            {
              partLabel: "(a)",
              marks: 6,
              bloomsLevel: "L2",
              coCode: "CO1",
              markingRubric: [{ stepNo: 1, description: "Definition of Type-1", marks: 3 }, { stepNo: 2, description: "Definition of Type-2", marks: 3 }]
            },
            {
              partLabel: "(b)",
              marks: 4,
              bloomsLevel: "L3",
              coCode: "CO1",
              markingRubric: [{ stepNo: 1, description: "Comparison table", marks: 4 }]
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.questionId).toBe(101);
      expect(res.body.code).toContain("Q-22CS61-U1-");
      expect(prisma.question.create).toHaveBeenCalled();
      expect(prisma.questionVersion.create).toHaveBeenCalled();
      expect(prisma.questionPart.createMany).toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/bank/courses/:courseId/analytics", () => {
    it("returns complete OBE coverage matrix", async () => {
      (prisma.course.findUnique as any).mockResolvedValue({
        id: 1,
        courseCode: "22CS61",
        courseOutcomes: [
          { id: 1, coCode: "CO1", description: "Outcome 1" },
          { id: 2, coCode: "CO2", description: "Outcome 2" }
        ]
      });

      (prisma.question.findMany as any).mockResolvedValue([
        {
          id: 1,
          unitNumber: 1,
          status: "APPROVED",
          versions: [
            {
              parts: [
                { marks: 10, bloomsLevel: "L2", coCode: "CO1" }
              ]
            }
          ]
        },
        {
          id: 2,
          unitNumber: 2,
          status: "DRAFT",
          versions: [
            {
              parts: [
                { marks: 10, bloomsLevel: "L3", coCode: "CO2" }
              ]
            }
          ]
        }
      ]);

      const res = await request(app)
        .get("/api/v1/bank/courses/1/analytics")
        .set("Authorization", getAuthHeader(1, "controller"));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.totalQuestions).toBe(2);
      expect(res.body.totalMarksCapacity).toBe(20);
      expect(res.body.unitDistribution[1]).toBe(1);
      expect(res.body.unitDistribution[2]).toBe(1);
      expect(res.body.bloomsDistribution.L2).toBe(10);
      expect(res.body.bloomsDistribution.L3).toBe(10);
      expect(res.body.coDistribution.CO1).toBe(10);
      expect(res.body.coDistribution.CO2).toBe(10);
      expect(res.body.statusDistribution.APPROVED).toBe(1);
      expect(res.body.statusDistribution.DRAFT).toBe(1);
    });
  });
});
