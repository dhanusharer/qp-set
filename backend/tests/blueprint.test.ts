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
    assessmentBlueprint: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn()
    },
    blueprintSection: {
      create: vi.fn()
    },
    blueprintRule: {
      createMany: vi.fn()
    },
    question: {
      findMany: vi.fn()
    },
    paperForm: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      create: vi.fn()
    },
    paperItemSnapshot: {
      createMany: vi.fn()
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

describe("Assessment Blueprint & Multi-Set Assembly Engine API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/v1/blueprints", () => {
    it("creates assessment blueprint with module sections and rules", async () => {
      (prisma.assessmentBlueprint.create as any).mockResolvedValue({
        id: 1,
        courseOfferingId: 10,
        title: "VTU SEE Examination: Cloud Computing",
        totalMarks: 100,
        durationMinutes: 180
      });

      (prisma.blueprintSection.create as any).mockResolvedValue({
        id: 101,
        blueprintId: 1,
        sectionName: "Module 1"
      });

      (prisma.blueprintRule.createMany as any).mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post("/api/v1/blueprints")
        .set("Authorization", getAuthHeader(1, "controller"))
        .set("Cookie", CSRF_COOKIE)
        .set("X-CSRF-Token", CSRF_HEADER)
        .send({
          courseOfferingId: 10,
          title: "VTU SEE Examination: Cloud Computing",
          examType: "SEE",
          totalMarks: 100,
          durationMinutes: 180,
          instructions: "Answer any FIVE full questions, choosing ONE full question from each module.",
          sections: [
            {
              sectionName: "Module 1",
              compulsoryQuestions: 1,
              optionalQuestions: 1,
              marksPerQuestion: 20,
              rules: [
                { targetUnit: 1, targetBlooms: "L2", targetCoCode: "CO1", requiredCount: 2 }
              ]
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.blueprintId).toBe(1);
    });
  });

  describe("POST /api/v1/blueprints/:id/feasibility", () => {
    it("analyzes question bank inventory and returns feasibility diagnostic", async () => {
      (prisma.assessmentBlueprint.findUnique as any).mockResolvedValue({
        id: 1,
        courseOffering: { courseId: 5 },
        sections: [
          {
            sectionName: "Module 1",
            rules: [{ targetUnit: 1, requiredCount: 2 }]
          },
          {
            sectionName: "Module 2",
            rules: [{ targetUnit: 2, requiredCount: 2 }]
          }
        ]
      });

      (prisma.question.findMany as any).mockResolvedValue([
        { id: 1, unitNumber: 1, status: "APPROVED", versions: [{ parts: [] }] },
        { id: 2, unitNumber: 1, status: "APPROVED", versions: [{ parts: [] }] },
        { id: 3, unitNumber: 1, status: "APPROVED", versions: [{ parts: [] }] },
        { id: 4, unitNumber: 2, status: "APPROVED", versions: [{ parts: [] }] }
      ]);

      const res = await request(app)
        .post("/api/v1/blueprints/1/feasibility")
        .set("Authorization", getAuthHeader(1, "controller"))
        .set("Cookie", CSRF_COOKIE)
        .set("X-CSRF-Token", CSRF_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.totalBankQuestions).toBe(4);
      expect(res.body.diagnosticResults).toHaveLength(2);
      expect(res.body.diagnosticResults[0].targetUnit).toBe(1);
      expect(res.body.diagnosticResults[0].availableInBank).toBe(3);
    });
  });

  describe("POST /api/v1/blueprints/:id/generate", () => {
    it("generates parallel sets (A, B, C) with frozen snapshots", async () => {
      (prisma.assessmentBlueprint.findUnique as any).mockResolvedValue({
        id: 1,
        courseOffering: { courseId: 5, course: { courseCode: "22CS61" } },
        sections: [
          {
            sectionName: "Module 1",
            marksPerQuestion: 20,
            rules: [{ targetUnit: 1, requiredCount: 2 }]
          }
        ]
      });

      (prisma.question.findMany as any).mockResolvedValue([
        {
          id: 10,
          unitNumber: 1,
          topic: "Virtualization Types",
          versions: [
            {
              id: 100,
              stemRichJson: { text: "Explain Type 1 hypervisor" },
              parts: [{ partLabel: "(a)", marks: 20, bloomsLevel: "L2", coCode: "CO1", markingRubric: [] }]
            }
          ]
        },
        {
          id: 11,
          unitNumber: 1,
          topic: "Containerization",
          versions: [
            {
              id: 101,
              stemRichJson: { text: "Explain Docker namespaces" },
              parts: [{ partLabel: "(a)", marks: 20, bloomsLevel: "L3", coCode: "CO1", markingRubric: [] }]
            }
          ]
        }
      ]);

      (prisma.paperForm.findUnique as any).mockResolvedValue(null);
      (prisma.paperForm.create as any).mockImplementation(({ data }: any) => Promise.resolve({ id: Math.floor(Math.random() * 1000), ...data }));
      (prisma.paperItemSnapshot.createMany as any).mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post("/api/v1/blueprints/1/generate")
        .set("Authorization", getAuthHeader(1, "controller"))
        .set("Cookie", CSRF_COOKIE)
        .set("X-CSRF-Token", CSRF_HEADER);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.forms).toHaveLength(3);
      expect(res.body.forms[0].setName).toBe("Set A");
      expect(res.body.forms[1].setName).toBe("Set B");
      expect(res.body.forms[2].setName).toBe("Set C (Reserve)");
      expect(prisma.paperItemSnapshot.createMany).toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/blueprints/:id/equivalence", () => {
    it("returns mathematical equivalence comparison across parallel forms", async () => {
      (prisma.paperForm.findMany as any).mockResolvedValue([
        {
          id: 1,
          setName: "Set A",
          status: "GENERATED",
          bloomVariance: 1.5,
          coVariance: 1.2,
          equivalenceScore: 98.2,
          snapshots: [
            { frozenMarks: 20, frozenBlooms: "L2", frozenCoCode: "CO1" },
            { frozenMarks: 20, frozenBlooms: "L3", frozenCoCode: "CO2" }
          ]
        },
        {
          id: 2,
          setName: "Set B",
          status: "GENERATED",
          bloomVariance: 1.9,
          coVariance: 1.5,
          equivalenceScore: 97.4,
          snapshots: [
            { frozenMarks: 20, frozenBlooms: "L2", frozenCoCode: "CO1" },
            { frozenMarks: 20, frozenBlooms: "L3", frozenCoCode: "CO2" }
          ]
        }
      ]);

      const res = await request(app)
        .get("/api/v1/blueprints/1/equivalence")
        .set("Authorization", getAuthHeader(1, "controller"));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.formsCount).toBe(2);
      expect(res.body.comparison[0].setName).toBe("Set A");
      expect(res.body.comparison[0].totalMarks).toBe(40);
      expect(res.body.comparison[1].setName).toBe("Set B");
      expect(res.body.comparison[1].totalMarks).toBe(40);
    });
  });
});
