import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  scaleVtuMarks,
  calculateVtuGrade,
  calculateDirectCoAttainment,
  calculatePoAttainment,
} from "../src/utils/attainmentEngine.js";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

// Mock prisma
vi.mock("../src/db.js", () => {
  return {
    prisma: {
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 1 }),
      },
      course: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 1) {
            return Promise.resolve({
              id: 1,
              code: "22CS61",
              name: "Software Engineering & Architecture",
              semester: "6",
              scheme: "2022",
              dept: "CSE",
              department: { name: "Computer Science and Engineering" },
              courseOutcomes: [
                { id: 101, coCode: "CO1", description: "Analyze requirements", targetMarks: 60 },
                { id: 102, coCode: "CO2", description: "Design architectures", targetMarks: 60 },
              ],
            });
          }
          return Promise.resolve(null);
        }),
      },
    },
  };
});

describe("OBE Attainment & VTU Scaling Unit & Integration Suite", () => {
  const app = createApp();
  let controllerToken: string;

  beforeAll(() => {
    controllerToken = jwt.sign(
      { sub: 1, role: "controller", username: "controller_admin" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
  });

  describe("Pure Logic: VTU Marks Scaling & Grading", () => {
    it("correctly scales SEE 100 to 50 and computes Grade A+ for 81/100", () => {
      const student = {
        usn: "1AM22CS001",
        studentName: "Student Alpha",
        cieMarks: 42,
        seeRawMarks: 78,
      };

      const { results, stats } = scaleVtuMarks([student]);
      expect(results).toHaveLength(1);
      const res = results[0];
      expect(res.seeScaledMarks).toBe(39); // 78 / 100 * 50 = 39
      expect(res.totalMarks).toBe(81);     // 42 + 39 = 81
      expect(res.grade).toBe("A+");
      expect(res.gradePoint).toBe(9);
      expect(res.isPassed).toBe(true);
      expect(res.resultStatus).toBe("DISTINCTION");
      expect(stats.passPercentage).toBe(100);
    });

    it("fails student if SEE raw marks are below minimum 35% threshold", () => {
      const student = {
        usn: "1AM22CS002",
        studentName: "Student Beta",
        cieMarks: 48, // high CIE
        seeRawMarks: 30, // below 35%
      };

      const { results, stats } = scaleVtuMarks([student]);
      const res = results[0];
      expect(res.seePassed).toBe(false);
      expect(res.isPassed).toBe(false);
      expect(res.grade).toBe("F");
      expect(res.gradePoint).toBe(0);
      expect(res.resultStatus).toBe("FAIL");
      expect(stats.totalFailed).toBe(1);
      expect(stats.passPercentage).toBe(0);
    });

    it("correctly aggregates class statistics and standard deviation for a cohort", () => {
      const cohort = [
        { usn: "1AM22CS001", studentName: "S1", cieMarks: 45, seeRawMarks: 90 }, // 45 + 45 = 90 (O)
        { usn: "1AM22CS002", studentName: "S2", cieMarks: 35, seeRawMarks: 70 }, // 35 + 35 = 70 (A)
        { usn: "1AM22CS003", studentName: "S3", cieMarks: 25, seeRawMarks: 50 }, // 25 + 25 = 50 (C)
      ];

      const { stats } = scaleVtuMarks(cohort);
      expect(stats.totalAppeared).toBe(3);
      expect(stats.totalPassed).toBe(3);
      expect(stats.passPercentage).toBe(100);
      expect(stats.avgTotalMarks).toBe(70);
      expect(stats.highestTotalMarks).toBe(90);
      expect(stats.lowestTotalMarks).toBe(50);
      expect(stats.gradeDistribution["O"]).toBe(1);
      expect(stats.gradeDistribution["A"]).toBe(1);
      expect(stats.gradeDistribution["C"]).toBe(1);
      expect(stats.stdDeviation).toBeGreaterThan(0);
    });
  });

  describe("Pure Logic: NBA Criterion 3 & 4 Direct Attainment", () => {
    it("calculates CO direct attainment and PO weighted attainment", () => {
      const cos = [
        { coCode: "CO1", description: "Design solutions" },
        { coCode: "CO2", description: "Implement modules" },
      ];
      const maxMarks = {
        cieMax: { CO1: 20, CO2: 20 },
        seeMax: { CO1: 30, CO2: 30 },
      };
      const studentScores = [
        { usn: "1AM22CS001", cieMarks: { CO1: 15, CO2: 16 }, seeMarks: { CO1: 24, CO2: 25 } },
        { usn: "1AM22CS002", cieMarks: { CO1: 14, CO2: 15 }, seeMarks: { CO1: 22, CO2: 24 } },
        { usn: "1AM22CS003", cieMarks: { CO1: 16, CO2: 18 }, seeMarks: { CO1: 25, CO2: 27 } },
      ];

      const coAttainments = calculateDirectCoAttainment(cos, maxMarks, studentScores, {
        targetPercent: 60,
        cieWeight: 0.5,
        seeWeight: 0.5,
      });

      expect(coAttainments).toHaveLength(2);
      expect(coAttainments[0].ciePercentageMeetingTarget).toBe(100);
      expect(coAttainments[0].cieAttainmentLevel).toBe(3);
      expect(coAttainments[0].seeAttainmentLevel).toBe(3);
      expect(coAttainments[0].overallDirectAttainment).toBe(3);

      const coPoMatrix = {
        CO1: { PO1: 3, PO2: 2 },
        CO2: { PO1: 3, PO2: 3 },
      };

      const poAttainments = calculatePoAttainment(coAttainments, coPoMatrix, 2.4);
      const po1 = poAttainments.find((p) => p.poCode === "PO1");
      expect(po1).toBeDefined();
      expect(po1?.mappedCosCount).toBe(2);
      expect(po1?.calculatedAttainment).toBe(3);
      expect(po1?.status).toBe("MET");
    });
  });

  describe("API Endpoints: /api/v1/attainment", () => {
    it("POST /api/v1/attainment/scale-marks scales marks and logs audit entry", async () => {
      const payload = {
        students: [
          { usn: "1AM22CS001", studentName: "Alice", cieMarks: 45, seeRawMarks: 85 },
          { usn: "1AM22CS002", studentName: "Bob", cieMarks: 38, seeRawMarks: 64 },
        ],
        config: {
          maxCieMarks: 50,
          maxSeeMarks: 100,
          scaledSeeWeight: 50,
          minSeePassPercent: 35,
          minTotalPassPercent: 40,
        },
      };

      const res = await request(app)
        .post("/api/v1/attainment/scale-marks")
        .set("Authorization", `Bearer ${controllerToken}`)
        .set("Cookie", "csrf-token=testcsrf")
        .set("X-CSRF-Token", "testcsrf")
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.stats.totalAppeared).toBe(2);
      expect(res.body.stats.passPercentage).toBe(100);
    });

    it("POST /api/v1/attainment/calculate-co-po computes NBA CO & PO attainment", async () => {
      const payload = {
        targetPercent: 60,
        cieWeight: 0.5,
        seeWeight: 0.5,
        targetThreshold: 2.4,
        cos: [
          { coCode: "CO1", description: "CO1 Desc" },
          { coCode: "CO2", description: "CO2 Desc" },
        ],
        maxMarks: {
          cieMax: { CO1: 25, CO2: 25 },
          seeMax: { CO1: 50, CO2: 50 },
        },
        studentScores: [
          { usn: "1AM22CS001", cieMarks: { CO1: 20, CO2: 18 }, seeMarks: { CO1: 40, CO2: 35 } },
          { usn: "1AM22CS002", cieMarks: { CO1: 18, CO2: 21 }, seeMarks: { CO1: 38, CO2: 42 } },
        ],
        coPoMatrix: {
          CO1: { PO1: 3, PO2: 2, PSO1: 3 },
          CO2: { PO1: 2, PO2: 3, PSO1: 2 },
        },
      };

      const res = await request(app)
        .post("/api/v1/attainment/calculate-co-po")
        .set("Authorization", `Bearer ${controllerToken}`)
        .set("Cookie", "csrf-token=testcsrf")
        .set("X-CSRF-Token", "testcsrf")
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.coAttainments).toHaveLength(2);
      expect(res.body.poAttainments).toHaveLength(14); // 12 POs + 2 PSOs
    });

    it("GET /api/v1/attainment/nba-sar-export/:courseId exports accreditation package", async () => {
      const res = await request(app)
        .get("/api/v1/attainment/nba-sar-export/1")
        .set("Authorization", `Bearer ${controllerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.nbaPackage.institution).toContain("AMCEC");
      expect(res.body.nbaPackage.criterion3).toBeDefined();
      expect(res.body.nbaPackage.criterion4).toBeDefined();
      expect(res.body.nbaPackage.digitalSignOff.status).toBe("OFFICIALLY_VERIFIED");
    });
  });
});
