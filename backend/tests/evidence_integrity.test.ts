import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { generateAccreditationEvidencePack } from "../src/services/evidencePack.service.js";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

const CSRF_COOKIE = "csrf-token=matchedtoken";
const CSRF_HEADER = "matchedtoken";

// Mock database
vi.mock("../src/db.js", () => {
  const mockOffering = {
    id: 1,
    academicYear: "2025-2026",
    semester: "6",
    schemeYear: "2022",
    courseId: 1,
    course: {
      id: 1,
      code: "22CS61",
      name: "Software Engineering & Cloud Computing",
      credits: 4,
      department: { name: "Computer Science & Engineering" },
      courseOutcomes: [
        { id: 1, coCode: "CO1", description: "Explain software process models and agile practices" },
        { id: 2, coCode: "CO2", description: "Design modular architectural blueprints" },
        { id: 3, coCode: "CO3", description: "Apply cloud microservices architectures" },
        { id: 4, coCode: "CO4", description: "Analyze software quality, testing, and security" },
        { id: 5, coCode: "CO5", description: "Formulate continuous delivery pipelines" },
      ],
    },
    department: { name: "Computer Science & Engineering" },
    blueprints: [
      {
        id: 1,
        title: "Semester End Examination 2026",
        examType: "SEE",
        totalMarks: 100,
        durationMinutes: 180,
        instructions: "Answer five full questions.",
        regulationProfile: {
          code: "VTU_ENGG_2022",
          name: "VTU Autonomous Regulations (2022 Scheme)",
          rules: [],
        },
        sections: [
          {
            id: 1,
            sectionName: "Module 1",
            compulsoryQuestions: 1,
            optionalQuestions: 1,
            marksPerQuestion: 20,
            rules: [{ targetUnit: 1, targetBlooms: "L2", targetCoCode: "CO1" }],
          },
        ],
        paperForms: [
          {
            id: 10,
            setName: "Set A",
            status: "SEALED",
            paperHash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
            bloomVariance: 1.2,
            coVariance: 1.1,
            equivalenceScore: 98.5,
            createdAt: new Date(),
            vaultRecord: { id: 1 },
            reviews: [],
            snapshots: [
              {
                questionNumber: "1",
                moduleNumber: 1,
                isAlternative: false,
                frozenMarks: 20,
                frozenBlooms: "L2",
                frozenCoCode: "CO1",
                frozenStemJson: "Explain the Spiral Model in detail.",
                frozenRubric: "5 marks diagram, 15 marks explanation",
                questionVersionId: 101,
              },
            ],
          },
        ],
      },
    ],
  };

  const mockQuestions = [
    {
      id: 1,
      code: "Q-CSE-001",
      unitNumber: 1,
      status: "APPROVED",
      psychometric: {
        facilityIndex: 0.62,
        discriminationIndex: 0.38,
        healthStatus: "HEALTHY",
      },
      usages: [{ id: 1, academicYear: "2024-2025" }],
      versions: [
        {
          versionNumber: 1,
          parts: [{ bloomsLevel: "L2", marks: 20, coCode: "CO1" }],
        },
      ],
      reviews: [
        {
          stage: "PEDAGOGICAL",
          verdict: "APPROVED",
          comments: "High alignment with Bloom L2",
          createdAt: new Date(),
        },
      ],
    },
  ];

  return {
    prisma: {
      courseOffering: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 1) return Promise.resolve(mockOffering);
          return Promise.resolve(null);
        }),
      },
      question: {
        findMany: vi.fn().mockResolvedValue(mockQuestions),
      },
      paperForm: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 10) {
            return Promise.resolve(mockOffering.blueprints[0].paperForms[0]);
          }
          return Promise.resolve(null);
        }),
      },
      auditLog: {
        findFirst: vi.fn().mockResolvedValue({
          id: 1,
          action: "EXAM_PAPER_VAULT_SEALED",
          details: "Form Set A sealed. SHA-256 Digest: a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
          createdAt: new Date(),
        }),
        create: vi.fn().mockResolvedValue({ id: 2 }),
      },
    },
  };
});

describe("Phase 13 & 14: 18-Part Evidence Pack & Forensic Integrity Verification", () => {
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

  it("generateAccreditationEvidencePack compiles all 18 structured sections", async () => {
    const pack = await generateAccreditationEvidencePack(1);

    expect(pack).not.toBeNull();
    expect(pack?.courseCode).toBe("22CS61");
    expect(pack?.complianceLevel).toBe("TIER_1_AUTONOMOUS_COMPLIANT");

    const sec = pack!.sections;
    // Verify each of the 18 sections is present and populated
    expect(sec.section1_Syllabus.courseCode).toBe("22CS61");
    expect(sec.section2_CourseOutcomes.length).toBe(5);
    expect(sec.section3_AssessmentBlueprint.totalMarks).toBe(100);
    expect(sec.section4_PaperFormSnapshots.length).toBe(1);
    expect(sec.section5_CryptographicSeals.canonicalScheme).toContain("RFC 8785");
    expect(sec.section6_AuthorMaskingAudit.auditVerdict).toBe("DOUBLE_BLIND_SCRUTINY_COMPLIANT");
    expect(sec.section7_BoeScrutinyLedger.workflowStages.length).toBe(3);
    expect(sec.section8_StepMarkingScheme.schemeStatus).toContain("STEP_MARKING");
    expect(sec.section9_ShamirSecretSharingAudit.quorumThreshold).toContain("3-of-5");
    expect(sec.section10_StrongRoomAccessLogs.accessEvents.length).toBeGreaterThan(0);
    expect(sec.section11_StudentCohortRoster.enrolledCohortSize).toBe(64);
    expect(sec.section12_VtuScaledMarksLedger.weightagePattern).toContain("50:50");
    expect(sec.section13_LetterGradeDistribution.gradingScale).toContain("10-Point");
    expect(sec.section14_PsychometricHealthAudit.itemsByHealth.HEALTHY).toBe(1);
    expect(sec.section15_ItemExposureClearance.complianceStatus).toBe("EXPOSURE_COMPLIANCE_CERTIFIED");
    expect(sec.section16_DirectCoAttainment.coAttainments.length).toBe(5);
    expect(sec.section17_CoPoArticulationMatrix.poHeaders.length).toBe(14);
    expect(sec.section18_CqiActionPlan.auditOutcome).toContain("NBA Criteria 3 & 4");

    // Executive summary checks
    expect(pack!.executiveSummary.evidenceIntegrityDigest).toBeDefined();
    expect(pack!.executiveSummary.passPercentage).toBeGreaterThan(0);
  });

  it("GET /api/v1/attainment/evidence/pack/:courseOfferingId returns 18-part dossier", async () => {
    const res = await request(app)
      .get("/api/v1/attainment/evidence/pack/1")
      .set("Authorization", `Bearer ${controllerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.evidencePack).toBeDefined();
    expect(res.body.evidencePack.sections.section1_Syllabus.courseCode).toBe("22CS61");
    expect(res.body.evidencePack.sections.section17_CoPoArticulationMatrix.matrixRows.length).toBe(5);
  });

  it("GET /api/v1/vault/papers/:formId/integrity returns RFC 8785 canonical verification", async () => {
    const res = await request(app)
      .get("/api/v1/vault/papers/10/integrity")
      .set("Authorization", `Bearer ${controllerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.formId).toBe(10);
    expect(res.body.rfc8785Compliant).toBe(true);
    expect(res.body.computedDigest).toBeDefined();
    expect(res.body.certificate.algorithm).toContain("RFC 8785");
  });
});
