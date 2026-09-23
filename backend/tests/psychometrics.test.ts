import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  calculateItemPsychometrics,
  StudentItemScore,
} from "../src/services/psychometrics.service.js";
import { evaluateQuestionHealth } from "../src/services/questionHealth.service.js";
import {
  evaluateItemExposure,
  DEFAULT_EXPOSURE_POLICY,
} from "../src/services/exposurePolicy.service.js";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

// Mock prisma
vi.mock("../src/db.js", () => {
  return {
    prisma: {
      question: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 1) {
            return Promise.resolve({
              id: 1,
              code: "Q-CSE-2026-0001",
              status: "APPROVED",
              course: { code: "22CS61", name: "Software Engineering" },
              psychometric: {
                difficultyIndex: 0.62,
                discriminationIndex: 0.38,
                sampleSize: 45,
                healthStatus: "HEALTHY",
              },
              usages: [{ id: 101, usedAt: new Date(), academicYear: "2024-2025" }],
              similaritiesAsSource: [],
              similaritiesAsTarget: [],
            });
          }
          return Promise.resolve(null);
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 1,
            code: "Q-CSE-2026-0001",
            status: "APPROVED",
            usages: [{ id: 101 }],
            psychometric: { healthStatus: "HEALTHY" },
          },
          {
            id: 2,
            code: "Q-CSE-2026-0002",
            status: "RETIRED",
            usages: [{ id: 102 }, { id: 103 }, { id: 104 }],
            psychometric: { healthStatus: "HIGH_EXPOSURE" },
          },
        ]),
      },
      questionPsychometric: {
        upsert: vi.fn().mockResolvedValue({
          id: 1,
          questionId: 1,
          difficultyIndex: 0.65,
          discriminationIndex: 0.40,
          sampleSize: 20,
          healthStatus: "HEALTHY",
        }),
      },
      questionUsage: {
        create: vi.fn().mockResolvedValue({
          id: 1,
          questionId: 1,
          academicYear: "2025-2026",
          semester: "6",
        }),
      },
      $transaction: vi.fn().mockImplementation((fns) => Promise.all(fns)),
    },
  };
});

describe("Psychometrics, Question Health & Exposure Engine Suite", () => {
  const app = createApp();
  let controllerToken: string;

  beforeAll(() => {
    controllerToken = jwt.sign(
      { sub: 1, role: "controller", username: "controller_admin" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
  });

  describe("Psychometrics Calculation Logic", () => {
    it("accurately computes difficulty (p-value) and discrimination (D)", () => {
      // 10 students: top scorers get full marks on item (10/10), low scorers get 0/10
      const responses: StudentItemScore[] = [
        { studentUsn: "S1", itemScore: 10, totalScore: 95 },
        { studentUsn: "S2", itemScore: 10, totalScore: 90 },
        { studentUsn: "S3", itemScore: 9, totalScore: 85 },
        { studentUsn: "S4", itemScore: 8, totalScore: 75 },
        { studentUsn: "S5", itemScore: 6, totalScore: 65 },
        { studentUsn: "S6", itemScore: 5, totalScore: 55 },
        { studentUsn: "S7", itemScore: 4, totalScore: 45 },
        { studentUsn: "S8", itemScore: 2, totalScore: 35 },
        { studentUsn: "S9", itemScore: 1, totalScore: 25 },
        { studentUsn: "S10", itemScore: 0, totalScore: 15 },
      ];

      const result = calculateItemPsychometrics(responses, 10);
      expect(result.sampleSize).toBe(10);
      expect(result.difficultyIndex).toBe(0.55); // (10+10+9+8+6+5+4+2+1+0) / (10*10) = 55/100 = 0.55
      expect(result.discriminationIndex).toBeGreaterThan(0.40); // High discrimination
      expect(result.discriminationLabel).toBe("EXCELLENT");
      expect(result.difficultyLabel).toBe("BALANCED");
      expect(result.pointBiserial).toBeGreaterThan(0.70); // Strong positive correlation with total score
    });

    it("identifies low discrimination defective items", () => {
      // Top students get 2/10, bottom students get 8/10 (inverted or confusing item)
      const responses: StudentItemScore[] = [
        { studentUsn: "S1", itemScore: 2, totalScore: 95 },
        { studentUsn: "S2", itemScore: 2, totalScore: 90 },
        { studentUsn: "S3", itemScore: 3, totalScore: 85 },
        { studentUsn: "S4", itemScore: 4, totalScore: 75 },
        { studentUsn: "S5", itemScore: 5, totalScore: 65 },
        { studentUsn: "S6", itemScore: 6, totalScore: 55 },
        { studentUsn: "S7", itemScore: 7, totalScore: 45 },
        { studentUsn: "S8", itemScore: 8, totalScore: 35 },
      ];

      const result = calculateItemPsychometrics(responses, 10);
      expect(result.discriminationIndex).toBeLessThan(0.20);
      expect(result.discriminationLabel).toBe("POOR_OR_NEGATIVE");
    });
  });

  describe("Question Health Deterministic Evaluator", () => {
    it("evaluates healthy item correctly", () => {
      const health = evaluateQuestionHealth({
        sampleSize: 60,
        difficultyIndex: 0.60,
        discriminationIndex: 0.35,
        timesUsed: 1,
        recentUsesCount: 1,
        hasUnresolvedDuplicateFlag: false,
        isRetired: false,
      });

      expect(health.status).toBe("HEALTHY");
      expect(health.explanation).toContain("Balanced");
    });

    it("evaluates insufficient data when sample size is low", () => {
      const health = evaluateQuestionHealth({
        sampleSize: 5,
        difficultyIndex: 0.50,
        discriminationIndex: 0.30,
        timesUsed: 0,
        recentUsesCount: 0,
        hasUnresolvedDuplicateFlag: false,
        isRetired: false,
      });

      expect(health.status).toBe("INSUFFICIENT_DATA");
    });

    it("flags duplicate risks as POSSIBLE_DUPLICATE", () => {
      const health = evaluateQuestionHealth({
        sampleSize: 50,
        difficultyIndex: 0.50,
        discriminationIndex: 0.30,
        timesUsed: 1,
        recentUsesCount: 1,
        hasUnresolvedDuplicateFlag: true,
        isRetired: false,
      });

      expect(health.status).toBe("POSSIBLE_DUPLICATE");
    });

    it("flags high exposure when used repeatedly in recent cycles", () => {
      const health = evaluateQuestionHealth({
        sampleSize: 120,
        difficultyIndex: 0.55,
        discriminationIndex: 0.32,
        timesUsed: 4,
        recentUsesCount: 3, // 3 in recent cycles
        hasUnresolvedDuplicateFlag: false,
        isRetired: false,
      });

      expect(health.status).toBe("HIGH_EXPOSURE");
    });
  });

  describe("Item Exposure Policy Evaluation", () => {
    it("grants high priority to virgin questions and excludes retired items", () => {
      const candidates = [
        {
          questionId: 1,
          questionCode: "Q-VIRGIN-001",
          status: "APPROVED",
          timesUsed: 0,
          recentExamUses: 0,
          sessionsSinceLastUse: null,
        },
        {
          questionId: 2,
          questionCode: "Q-RETIRED-002",
          status: "RETIRED",
          timesUsed: 5,
          recentExamUses: 1,
          sessionsSinceLastUse: 3,
        },
        {
          questionId: 3,
          questionCode: "Q-COOLDOWN-003",
          status: "APPROVED",
          timesUsed: 1,
          recentExamUses: 1,
          sessionsSinceLastUse: 1, // Cooldown violation (min 2)
        },
      ];

      const evaluations = evaluateItemExposure(candidates, DEFAULT_EXPOSURE_POLICY);
      expect(evaluations).toHaveLength(3);

      // Candidate 1: Virgin
      expect(evaluations[0].eligible).toBe(true);
      expect(evaluations[0].priorityScore).toBe(100);

      // Candidate 2: Retired
      expect(evaluations[1].eligible).toBe(false);
      expect(evaluations[1].violations[0]).toContain("retired");

      // Candidate 3: In Cooldown
      expect(evaluations[2].eligible).toBe(false);
      expect(evaluations[2].violations[0]).toContain("cooldown");
    });
  });

  describe("API Endpoints: /api/v1/psychometrics", () => {
    it("GET /api/v1/psychometrics/questions/:id retrieves psychometric health", async () => {
      const res = await request(app)
        .get("/api/v1/psychometrics/questions/1")
        .set("Authorization", `Bearer ${controllerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.code).toBe("Q-CSE-2026-0001");
      expect(res.body.health.status).toBe("HEALTHY");
    });

    it("POST /api/v1/psychometrics/questions/:id/record-exam-performance ingests student scores", async () => {
      const payload = {
        maxItemMarks: 10,
        academicYear: "2025-2026",
        semester: "6",
        assessmentType: "SEE",
        responses: [
          { studentUsn: "1AM22CS001", itemScore: 9, totalScore: 88 },
          { studentUsn: "1AM22CS002", itemScore: 8, totalScore: 82 },
          { studentUsn: "1AM22CS003", itemScore: 6, totalScore: 70 },
        ],
      };

      const res = await request(app)
        .post("/api/v1/psychometrics/questions/1/record-exam-performance")
        .set("Authorization", `Bearer ${controllerToken}`)
        .set("Cookie", "csrf-token=testcsrf")
        .set("X-CSRF-Token", "testcsrf")
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.psychometrics).toBeDefined();
      expect(res.body.health).toBeDefined();
    });

    it("POST /api/v1/psychometrics/exposure/evaluate evaluates question batch", async () => {
      const res = await request(app)
        .post("/api/v1/psychometrics/exposure/evaluate")
        .set("Authorization", `Bearer ${controllerToken}`)
        .set("Cookie", "csrf-token=testcsrf")
        .set("X-CSRF-Token", "testcsrf")
        .send({ questionIds: [1, 2] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.evaluations).toHaveLength(2);
    });
  });
});
