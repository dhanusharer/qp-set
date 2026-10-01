import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

// Set environment variables for tests
process.env.DATABASE_URL = "postgresql://qpset:qpset@localhost:5432/qpset?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret-minimum-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";

// Mock Prisma
vi.mock("../src/db.js", () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      }
    }
  };
});

import { createApp } from "../src/app.js";

const app = createApp();

const CSRF_COOKIE = "csrf-token=matchedtoken";
const CSRF_HEADER = "matchedtoken";

function getAuthHeader(userId = 1, role = "qpsetter") {
  const token = jwt.sign(
    { sub: userId, role, username: "faculty_user" },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: "1h" }
  );
  return `Bearer ${token}`;
}

describe("Intelligent Question Framing & PYQ Recommendation Engine", () => {
  it("POST /api/v1/bank/recommend-and-frame > extracts concepts and returns 3-tier framed questions with rubrics", async () => {
    const res = await request(app)
      .post("/api/v1/bank/recommend-and-frame")
      .set("Authorization", getAuthHeader(3, "qpsetter"))
      .set("Cookie", CSRF_COOKIE)
      .set("X-CSRF-Token", CSRF_HEADER)
      .send({
        courseCode: "21CS32",
        courseName: "Data Structures & Applications",
        partialText: "Explain AVL tree rotation and rebalancing",
        targetMarks: 10,
        targetBlooms: "L3"
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.extractedTopic).toBe("Tree");
    expect(data.matchedModule).toBe(3);
    expect(data.targetMarks).toBe(10);

    // Verify Historical PYQs
    expect(Array.isArray(data.historicalPYQs)).toBe(true);
    expect(data.historicalPYQs.length).toBeGreaterThan(0);
    expect(data.historicalPYQs[0]).toHaveProperty("examSession");
    expect(data.historicalPYQs[0]).toHaveProperty("stepRubric");

    // Verify Framed Question Variations
    expect(Array.isArray(data.framedVariations)).toBe(true);
    expect(data.framedVariations.length).toBeGreaterThanOrEqual(3);

    // Verify Step Rubric Marks Sum to exactly targetMarks
    for (const variation of data.framedVariations) {
      expect(variation.marks).toBe(10);
      const rubricSum = variation.stepRubric.reduce((sum: number, step: any) => sum + step.marks, 0);
      expect(rubricSum).toBe(10);
    }
  });

  it("POST /api/v1/bank/recommend-and-frame > flags high repetition similarity when user enters near-verbatim past paper question", async () => {
    const nearDuplicateText = "What is an AVL Tree Explain LL RR LR and RL rotation techniques to maintain balance factor";

    const res = await request(app)
      .post("/api/v1/bank/recommend-and-frame")
      .set("Authorization", getAuthHeader(3, "qpsetter"))
      .set("Cookie", CSRF_COOKIE)
      .set("X-CSRF-Token", CSRF_HEADER)
      .send({
        courseCode: "21CS32",
        partialText: nearDuplicateText,
        targetMarks: 10,
        targetBlooms: "L4"
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const rep = res.body.data.repetitionCheck;
    expect(rep.maxSimilarityPct).toBeGreaterThan(60);
    expect(rep.riskLevel).toBe("HIGH");
    expect(rep.warningMessage).toContain("High Repetition Risk");
  });

  it("POST /api/v1/bank/recommend-and-frame > rejects unauthenticated requests with 401", async () => {
    const res = await request(app)
      .post("/api/v1/bank/recommend-and-frame")
      .set("Cookie", CSRF_COOKIE)
      .set("X-CSRF-Token", CSRF_HEADER)
      .send({
        partialText: "Dijkstra algorithm shortest path"
      });

    expect(res.status).toBe(401);
  });
});
