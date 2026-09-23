import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  evaluateParallelFormEquivalence,
  FormRepresentation,
} from "../src/services/formEquivalence.service.js";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

const CSRF_COOKIE = "csrf-token=matchedtoken";
const CSRF_HEADER = "matchedtoken";

// Mock database
vi.mock("../src/db.js", () => {
  const mockProfile = {
    id: 1,
    code: "VTU_ENGG_2022",
    name: "VTU Autonomous Engineering 2022 Scheme",
    academicYear: "2022-2026",
    schemeYear: "2022",
    totalMarks: 100,
    seeWeightage: 50,
    cieWeightage: 50,
    passingMarksSEE: 35,
    passingMarksTotal: 40,
    isActive: true,
    rules: [
      {
        id: 10,
        ruleType: "MODULE_COUNT",
        ruleKey: "TOTAL_MODULES",
        ruleValue: "5",
        description: "Question paper must span exactly 5 autonomous modules",
        isEnforced: true,
      },
      {
        id: 11,
        ruleType: "CHOICE_ARCHITECTURE",
        ruleKey: "INTERNAL_CHOICE_PER_MODULE",
        ruleValue: "OR_PAIR",
        description: "Each module must have two questions with internal choice",
        isEnforced: true,
      },
    ],
  };

  const mockBlueprint = {
    id: 1,
    courseOfferingId: 1,
    title: "End Sem Autonomous Examination",
    examType: "SEE",
    totalMarks: 100,
    durationMinutes: 180,
    regulationProfileId: 1,
    courseOffering: {
      courseId: 1,
      course: {
        id: 1,
        code: "22CS61",
        name: "Software Engineering",
        courseOutcomes: [
          { id: 1, code: "CO1", description: "Foundations" },
          { id: 2, code: "CO2", description: "Architecture" },
        ],
      },
    },
    regulationProfile: mockProfile,
    sections: [
      {
        id: 1,
        sectionName: "Module 1",
        compulsoryQuestions: 1,
        optionalQuestions: 1,
        marksPerQuestion: 20,
        orderIndex: 0,
        rules: [{ id: 1, targetUnit: 1, requiredCount: 2 }],
      },
      {
        id: 2,
        sectionName: "Module 2",
        compulsoryQuestions: 1,
        optionalQuestions: 1,
        marksPerQuestion: 20,
        orderIndex: 1,
        rules: [{ id: 2, targetUnit: 2, requiredCount: 2 }],
      },
    ],
  };

  const mockQuestions = [
    {
      id: 1,
      code: "Q-01",
      unitNumber: 1,
      status: "APPROVED",
      usages: [],
      psychometrics: { facilityIndex: 0.65 },
      versions: [
        {
          parts: [{ bloomsLevel: "L2", marks: 10 }, { bloomsLevel: "L3", marks: 10 }],
        },
      ],
    },
    {
      id: 2,
      code: "Q-02",
      unitNumber: 1,
      status: "APPROVED",
      usages: [],
      psychometrics: { facilityIndex: 0.58 },
      versions: [
        {
          parts: [{ bloomsLevel: "L2", marks: 10 }, { bloomsLevel: "L3", marks: 10 }],
        },
      ],
    },
    {
      id: 3,
      code: "Q-03",
      unitNumber: 2,
      status: "APPROVED",
      usages: [],
      psychometrics: { facilityIndex: 0.52 },
      versions: [
        {
          parts: [{ bloomsLevel: "L3", marks: 10 }, { bloomsLevel: "L4", marks: 10 }],
        },
      ],
    },
    {
      id: 4,
      code: "Q-04",
      unitNumber: 2,
      status: "APPROVED",
      usages: [],
      psychometrics: { facilityIndex: 0.55 },
      versions: [
        {
          parts: [{ bloomsLevel: "L3", marks: 10 }, { bloomsLevel: "L4", marks: 10 }],
        },
      ],
    },
  ];

  return {
    prisma: {
      regulationProfile: {
        findMany: vi.fn().mockResolvedValue([mockProfile]),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 1 || where.code === "VTU_ENGG_2022") return Promise.resolve(mockProfile);
          return Promise.resolve(null);
        }),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 2,
            ...data,
            rules: data.rules?.create || [],
          })
        ),
      },
      assessmentBlueprint: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 1) return Promise.resolve(mockBlueprint);
          return Promise.resolve(null);
        }),
        findMany: vi.fn().mockResolvedValue([mockBlueprint]),
      },
      question: {
        findMany: vi.fn().mockResolvedValue(mockQuestions),
      },
      paperForm: {
        findMany: vi.fn().mockImplementation(({ where }) => {
          if (where.blueprintId === 1) {
            return Promise.resolve([
              {
                id: 101,
                setName: "Set A",
                status: "GENERATED",
                bloomVariance: 1.2,
                coVariance: 1.0,
                equivalenceScore: 98.0,
                snapshots: [
                  {
                    questionNumber: "1",
                    moduleNumber: 1,
                    isAlternative: false,
                    frozenMarks: 20,
                    frozenBlooms: "L2",
                    frozenCoCode: "CO1",
                    questionVersionId: 1,
                    questionVersion: { question: { psychometrics: { facilityIndex: 0.65 } } },
                  },
                  {
                    questionNumber: "2",
                    moduleNumber: 1,
                    isAlternative: true,
                    frozenMarks: 20,
                    frozenBlooms: "L3",
                    frozenCoCode: "CO1",
                    questionVersionId: 2,
                    questionVersion: { question: { psychometrics: { facilityIndex: 0.58 } } },
                  },
                ],
              },
              {
                id: 102,
                setName: "Set B",
                status: "GENERATED",
                bloomVariance: 1.5,
                coVariance: 1.2,
                equivalenceScore: 97.5,
                snapshots: [
                  {
                    questionNumber: "1",
                    moduleNumber: 1,
                    isAlternative: false,
                    frozenMarks: 20,
                    frozenBlooms: "L2",
                    frozenCoCode: "CO1",
                    questionVersionId: 3,
                    questionVersion: { question: { psychometrics: { facilityIndex: 0.62 } } },
                  },
                  {
                    questionNumber: "2",
                    moduleNumber: 1,
                    isAlternative: true,
                    frozenMarks: 20,
                    frozenBlooms: "L3",
                    frozenCoCode: "CO1",
                    questionVersionId: 4,
                    questionVersion: { question: { psychometrics: { facilityIndex: 0.56 } } },
                  },
                ],
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      },
    },
  };
});

describe("Phase 9 & 10: Parallel-Form Equivalence & Regulation-as-Data", () => {
  let app: any;
  let controllerToken: string;

  beforeAll(() => {
    app = createApp();
    controllerToken = jwt.sign(
      { sub: 1, role: "controller", username: "controller_admin" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
  });

  // ─── Unit Test: 8-Factor Parallel Equivalence Engine ───────

  it("calculates 8-dimension equivalence scorecard with high parity between Set A and Set B", () => {
    const mockForms: FormRepresentation[] = [
      {
        setName: "Set A",
        snapshots: [
          {
            questionNumber: "1",
            moduleNumber: 1,
            isAlternative: false,
            frozenMarks: 20,
            frozenBlooms: "L2",
            frozenCoCode: "CO1",
            questionVersionId: 10,
            difficultyIndex: 0.62,
          },
          {
            questionNumber: "2",
            moduleNumber: 2,
            isAlternative: false,
            frozenMarks: 20,
            frozenBlooms: "L3",
            frozenCoCode: "CO2",
            questionVersionId: 11,
            difficultyIndex: 0.58,
          },
        ],
      },
      {
        setName: "Set B",
        snapshots: [
          {
            questionNumber: "1",
            moduleNumber: 1,
            isAlternative: false,
            frozenMarks: 20,
            frozenBlooms: "L2",
            frozenCoCode: "CO1",
            questionVersionId: 12,
            difficultyIndex: 0.60,
          },
          {
            questionNumber: "2",
            moduleNumber: 2,
            isAlternative: false,
            frozenMarks: 20,
            frozenBlooms: "L3",
            frozenCoCode: "CO2",
            questionVersionId: 13,
            difficultyIndex: 0.55,
          },
        ],
      },
    ];

    const result = evaluateParallelFormEquivalence(1, mockForms);

    expect(result.overallVerdict).toBe("FORM_EQUIVALENCE_PASS");
    expect(result.overallEquivalenceScore).toBeGreaterThanOrEqual(95);
    expect(result.pairwiseComparisons.length).toBe(1);

    const pairwise = result.pairwiseComparisons[0];
    expect(pairwise.setPair).toBe("Set A vs Set B");
    expect(pairwise.scorecards.length).toBe(8);

    // Verify all 8 dimensions are present
    const dimensions = pairwise.scorecards.map((s) => s.dimension);
    expect(dimensions).toContain("Total Marks Equilibrium");
    expect(dimensions).toContain("Question Count & Choice Symmetry");
    expect(dimensions).toContain("Unit / Module Coverage Symmetry");
    expect(dimensions).toContain("Course Outcome (CO) Distribution");
    expect(dimensions).toContain("Bloom's Cognitive Distribution");
    expect(dimensions).toContain("Psychometric Difficulty Balance");
    expect(dimensions).toContain("Cross-Form Item Overlap Ratio");
    expect(dimensions).toContain("Item Exposure Policy Clearance");
  });

  it("detects cross-form item overlap violation when sets share too many items", () => {
    const mockSharedForms: FormRepresentation[] = [
      {
        setName: "Set A",
        snapshots: [
          {
            questionNumber: "1",
            moduleNumber: 1,
            isAlternative: false,
            frozenMarks: 20,
            frozenBlooms: "L2",
            frozenCoCode: "CO1",
            questionVersionId: 10,
          },
          {
            questionNumber: "2",
            moduleNumber: 2,
            isAlternative: false,
            frozenMarks: 20,
            frozenBlooms: "L3",
            frozenCoCode: "CO2",
            questionVersionId: 11,
          },
        ],
      },
      {
        setName: "Set B",
        snapshots: [
          {
            questionNumber: "1",
            moduleNumber: 1,
            isAlternative: false,
            frozenMarks: 20,
            frozenBlooms: "L2",
            frozenCoCode: "CO1",
            questionVersionId: 10, // SHARED ITEM
          },
          {
            questionNumber: "2",
            moduleNumber: 2,
            isAlternative: false,
            frozenMarks: 20,
            frozenBlooms: "L3",
            frozenCoCode: "CO2",
            questionVersionId: 11, // SHARED ITEM
          },
        ],
      },
    ];

    const result = evaluateParallelFormEquivalence(1, mockSharedForms);
    const overlapScorecard = result.pairwiseComparisons[0].scorecards.find(
      (s) => s.dimension === "Cross-Form Item Overlap Ratio"
    );

    expect(overlapScorecard).toBeDefined();
    expect(overlapScorecard?.status).toBe("FAIL");
    expect(result.overallVerdict).toBe("FORM_EQUIVALENCE_FAIL");
  });

  // ─── Integration: Regulation Profile API ──────────────────

  it("GET /api/v1/regulations returns list of regulation profiles", async () => {
    const res = await request(app)
      .get("/api/v1/regulations")
      .set("Authorization", `Bearer ${controllerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.profiles)).toBe(true);
    expect(res.body.profiles.length).toBeGreaterThan(0);
    expect(res.body.profiles[0].code).toBe("VTU_ENGG_2022");
  });

  it("GET /api/v1/regulations/:id returns detailed profile with rules", async () => {
    const res = await request(app)
      .get("/api/v1/regulations/1")
      .set("Authorization", `Bearer ${controllerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.code).toBe("VTU_ENGG_2022");
    expect(res.body.profile.rules.length).toBe(2);
  });

  it("POST /api/v1/regulations creates a new autonomous regulation profile", async () => {
    const res = await request(app)
      .post("/api/v1/regulations")
      .set("Authorization", `Bearer ${controllerToken}`)
      .set("Cookie", CSRF_COOKIE)
      .set("X-CSRF-Token", CSRF_HEADER)
      .send({
        code: "AMCEC_AUTONOMOUS_2026",
        name: "AMCEC Autonomous NEP 2026 Scheme",
        academicYear: "2026-2030",
        schemeYear: "2026",
        totalMarks: 100,
        seeWeightage: 50,
        cieWeightage: 50,
        passingMarksSEE: 35,
        passingMarksTotal: 40,
        rules: [
          {
            ruleType: "BLOOMS_RATIO",
            ruleKey: "MIN_L3_HIGHER",
            ruleValue: "40",
            description: "At least 40% of marks must test Level 3 or higher cognitive levels",
            isEnforced: true,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.code).toBe("AMCEC_AUTONOMOUS_2026");
  });

  // ─── Integration: Blueprint Parallel Equivalence Endpoint ──

  it("GET /api/v1/blueprints/:id/equivalence returns 8-factor evaluation results", async () => {
    const res = await request(app)
      .get("/api/v1/blueprints/1/equivalence")
      .set("Authorization", `Bearer ${controllerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.overallVerdict).toBeDefined();
    expect(res.body.overallEquivalenceScore).toBeDefined();
    expect(Array.isArray(res.body.pairwiseComparisons)).toBe(true);
    expect(Array.isArray(res.body.formsSummary)).toBe(true);
  });

  // ─── Integration: Feasibility Diagnostic Engine ───────────

  it("POST /api/v1/blueprints/:id/feasibility evaluates exposure and structured remediation", async () => {
    const res = await request(app)
      .post("/api/v1/blueprints/1/feasibility")
      .set("Authorization", `Bearer ${controllerToken}`)
      .set("Cookie", CSRF_COOKIE)
      .set("X-CSRF-Token", CSRF_HEADER)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isFeasible).toBe(true);
    expect(res.body.verdict).toBeDefined();
    expect(res.body.readinessScore).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(res.body.diagnosticResults)).toBe(true);
    expect(Array.isArray(res.body.remediationPlan)).toBe(true);
    expect(res.body.regulationProfile).toBeDefined();
  });
});
