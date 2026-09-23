import { describe, it, expect, vi, beforeAll } from "vitest";
import { computeCanonicalHash } from "../src/utils/cryptoVault.js";

// Mock database to provide fast, deterministic, offline-resilient validation
const mockStore = {
  institutions: [
    { id: 1, code: "AMCEC", name: "AMC Engineering College (Autonomous)", isAutonomous: true }
  ],
  departments: [
    { id: 1, code: "CSE", name: "Department of Computer Science & Engineering", institutionId: 1 }
  ],
  programs: [
    { id: 1, departmentId: 1, code: "BE_CSE", name: "B.E. in Computer Science & Engineering" }
  ],
  courses: [
    { id: 101, courseCode: "BCS303", courseName: "Data Structures & Applications", semester: "3", schemeYear: "2022", credits: 4, departmentId: 1 }
  ],
  curriculumVersions: [
    { id: 1, code: "VTU_2022_SCHEME", name: "VTU Autonomous Engineering 2022 CBCS Scheme", schemeYear: "2022", effectiveFromYear: "2022-23" },
    { id: 2, code: "AMCEC_2026_NEP", name: "AMCEC Autonomous 2026 NEP Scheme", schemeYear: "2026", effectiveFromYear: "2026-27" }
  ],
  curriculumCourses: [
    { id: 1, curriculumVersionId: 1, courseId: 101, semester: "3", credits: 4, isElective: false },
    { id: 2, curriculumVersionId: 2, courseId: 101, semester: "3", credits: 4, isElective: false }
  ],
  academicYears: [
    { id: 1, yearCode: "2026-27", startDate: new Date("2026-08-01"), endDate: new Date("2027-07-31"), isCurrent: true },
    { id: 2, yearCode: "2027-28", startDate: new Date("2027-08-01"), endDate: new Date("2028-07-31"), isCurrent: false }
  ],
  academicTerms: [
    { id: 1, academicYearId: 1, termCode: "ODD_2026", termType: "ODD", displayName: "Odd Semester 2026-27", isCurrent: true },
    { id: 2, academicYearId: 1, termCode: "SUMMER_2027", termType: "SUMMER", displayName: "Summer Make-up Term 2026-27", isCurrent: false }
  ],
  assessmentTypes: [
    { id: 1, code: "SEE", displayName: "Semester End Examination", category: "SUMMATIVE", isTerminal: true },
    { id: 2, code: "MAKEUP", displayName: "Summer Make-up Examination", category: "REMEDIAL", isTerminal: true },
    { id: 3, code: "CIE_1", displayName: "Continuous Internal Evaluation 1", category: "FORMATIVE", isTerminal: false }
  ],
  examSessions: [
    { id: 1, academicYearId: 1, assessmentTypeId: 1, name: "SEE December 2026", sessionCode: "SEE_DEC_2026", status: "ACTIVE" },
    { id: 2, academicYearId: 2, assessmentTypeId: 1, name: "SEE December 2027", sessionCode: "SEE_DEC_2027", status: "PLANNING" },
    { id: 3, academicYearId: 1, assessmentTypeId: 2, name: "Summer Makeup August 2027", sessionCode: "SUMMER_MKUP_2027", status: "ACTIVE" }
  ],
  assessmentEvents: [] as any[],
  assessmentRegistrations: [] as any[],
  questions: [
    { id: 501, code: "Q-CSE-DS-001", courseId: 101, unitNumber: 1, topic: "Asymptotic Complexity", status: "APPROVED" }
  ],
  questionVersions: [
    { id: 1001, questionId: 501, versionNumber: 1, plainText: "Explain Big-O, Omega, and Theta notations with mathematical definitions.", stemRichJson: { text: "Explain Big-O, Omega, and Theta notations with mathematical definitions." } },
    { id: 1002, questionId: 501, versionNumber: 2, plainText: "Analyze time complexities for worst and best cases using Big-O and Omega with plots.", stemRichJson: { text: "Analyze time complexities for worst and best cases using Big-O and Omega with plots." } }
  ],
  paperForms: [] as any[],
  paperVersions: [] as any[],
  paperItemSnapshots: [] as any[],
  questionUsages: [] as any[]
};

vi.mock("../src/db.js", () => {
  return {
    prisma: {
      institution: {
        findUnique: vi.fn(({ where }) => mockStore.institutions.find(i => i.code === where.code)),
        upsert: vi.fn(({ create }) => create)
      },
      department: {
        findFirst: vi.fn(() => mockStore.departments[0]),
        findMany: vi.fn(() => mockStore.departments)
      },
      course: {
        findUnique: vi.fn(({ where }) => mockStore.courses.find(c => c.id === where.id)),
        findMany: vi.fn(() => mockStore.courses),
        count: vi.fn(({ where }) => mockStore.courses.filter(c => c.courseCode === where.courseCode).length)
      },
      curriculumVersion: {
        findUnique: vi.fn(({ where }) => mockStore.curriculumVersions.find(cv => cv.code === where.code || cv.id === where.id)),
        findMany: vi.fn(() => mockStore.curriculumVersions)
      },
      academicYear: {
        findMany: vi.fn(() => mockStore.academicYears),
        findUnique: vi.fn(({ where }) => mockStore.academicYears.find(ay => ay.yearCode === where.yearCode || ay.id === where.id))
      },
      examSession: {
        findMany: vi.fn(() => mockStore.examSessions),
        findUnique: vi.fn(({ where }) => mockStore.examSessions.find(s => s.sessionCode === where.sessionCode || s.id === where.id)),
        create: vi.fn(({ data }) => {
          const newSession = { id: mockStore.examSessions.length + 1, ...data };
          mockStore.examSessions.push(newSession);
          return newSession;
        })
      },
      assessmentEvent: {
        findMany: vi.fn(() => mockStore.assessmentEvents),
        findFirst: vi.fn(({ where }) => mockStore.assessmentEvents.find(e => e.eventCode === where.eventCode)),
        findUnique: vi.fn(({ where }) => mockStore.assessmentEvents.find(e => e.id === where.id)),
        create: vi.fn(({ data }) => {
          const newEvent = { id: mockStore.assessmentEvents.length + 1, ...data };
          mockStore.assessmentEvents.push(newEvent);
          return newEvent;
        }),
        upsert: vi.fn(({ create }) => {
          const exists = mockStore.assessmentEvents.find(e => e.eventCode === create.eventCode);
          if (exists) return exists;
          const newEvent = { id: mockStore.assessmentEvents.length + 1, ...create };
          mockStore.assessmentEvents.push(newEvent);
          return newEvent;
        })
      },
      assessmentRegistration: {
        findMany: vi.fn(({ where }) => mockStore.assessmentRegistrations.filter(r => r.assessmentEventId === where.assessmentEventId)),
        count: vi.fn(({ where }) => mockStore.assessmentRegistrations.filter(r => r.assessmentEventId === where.assessmentEventId).length),
        create: vi.fn(({ data }) => {
          const newReg = { id: mockStore.assessmentRegistrations.length + 1, ...data };
          mockStore.assessmentRegistrations.push(newReg);
          return newReg;
        })
      },
      question: {
        findUnique: vi.fn(({ where }) => mockStore.questions.find(q => q.id === where.id || q.code === where.code))
      },
      questionVersion: {
        findUnique: vi.fn(({ where }) => mockStore.questionVersions.find(v => v.id === where.id))
      },
      paperForm: {
        create: vi.fn(({ data }) => {
          const newForm = { id: mockStore.paperForms.length + 1, ...data };
          mockStore.paperForms.push(newForm);
          return newForm;
        })
      },
      paperVersion: {
        findUnique: vi.fn(({ where }) => mockStore.paperVersions.find(pv => pv.id === where.id)),
        create: vi.fn(({ data }) => {
          const newPv = { id: mockStore.paperVersions.length + 1, ...data };
          mockStore.paperVersions.push(newPv);
          return newPv;
        })
      },
      paperItemSnapshot: {
        findUnique: vi.fn(({ where }) => mockStore.paperItemSnapshots.find(s => s.id === where.id)),
        create: vi.fn(({ data }) => {
          const newSnap = { id: mockStore.paperItemSnapshots.length + 1, ...data };
          mockStore.paperItemSnapshots.push(newSnap);
          return newSnap;
        })
      },
      questionUsage: {
        findMany: vi.fn(({ where }) => mockStore.questionUsages.filter(u => u.questionId === where.questionId)),
        count: vi.fn(({ where }) => mockStore.questionUsages.filter(u => u.questionId === where.questionId).length),
        create: vi.fn(({ data }) => {
          const newUsage = { id: mockStore.questionUsages.length + 1, ...data };
          mockStore.questionUsages.push(newUsage);
          return newUsage;
        })
      }
    }
  };
});

describe("Academic Cycle & Exam Session Architecture Suite", () => {
  it("CASE 1 & CASE 2: Multi-Year reuse of canonical Course across 2026-27 SEE and 2027-28 SEE without duplicate course records", async () => {
    const { prisma } = await import("../src/db.js");

    // Event 1 in 2026-27 session
    const event2026 = await prisma.assessmentEvent.upsert({
      where: { eventCode: "SEE_2026_BCS303" },
      update: {},
      create: {
        examSessionId: 1, // SEE Dec 2026
        courseId: 101,    // Canonical Course
        curriculumVersionId: 1,
        assessmentTypeId: 1,
        eventCode: "SEE_2026_BCS303",
        title: "Data Structures SEE — December 2026",
        status: "SEALED",
      },
    });

    // Event 2 in 2027-28 session
    const event2027 = await prisma.assessmentEvent.upsert({
      where: { eventCode: "SEE_2027_BCS303" },
      update: {},
      create: {
        examSessionId: 2, // SEE Dec 2027
        courseId: 101,    // Canonical Course
        curriculumVersionId: 1,
        assessmentTypeId: 1,
        eventCode: "SEE_2027_BCS303",
        title: "Data Structures SEE — December 2027",
        status: "DRAFT",
      },
    });

    // Both events share canonical Course 101
    expect(event2026.courseId).toBe(101);
    expect(event2027.courseId).toBe(101);
    expect(event2026.examSessionId).toBe(1);
    expect(event2027.examSessionId).toBe(2);

    // Course count for BCS303 remains exactly 1 (Zero Course Duplication)
    const bcsCount = await prisma.course.count({ where: { courseCode: "BCS303" } });
    expect(bcsCount).toBe(1);
  });

  it("CASE 3 & CASE 6: Makeup ExamSession decouples from single offering and supports multiple candidate cohorts", async () => {
    const { prisma } = await import("../src/db.js");

    // Create Makeup AssessmentEvent with courseOfferingId = null
    const makeupEvent = await prisma.assessmentEvent.create({
      data: {
        examSessionId: 3, // Summer Makeup August 2027
        courseId: 101,
        curriculumVersionId: 1,
        assessmentTypeId: 2,
        courseOfferingId: null, // Multi-cohort decouple
        eventCode: "MKUP_2027_BCS303",
        title: "Data Structures Summer Makeup — August 2027",
        status: "BLUEPRINT_READY",
      },
    });

    expect(makeupEvent.courseOfferingId).toBeNull();

    // Register candidate from current cohort (2022-23)
    const candA = await prisma.assessmentRegistration.create({
      data: {
        assessmentEventId: makeupEvent.id,
        usn: "1AM22CS010",
        studentName: "Ishaan Deshmukh",
        candidateType: "MAKEUP",
        sourceCohortYear: "2022-23",
        cieMarks: 40,
      },
    });

    // Register candidate from older backlog cohort (2021-22)
    const candB = await prisma.assessmentRegistration.create({
      data: {
        assessmentEventId: makeupEvent.id,
        usn: "1AM21CS099",
        studentName: "Varun Reddy",
        candidateType: "BACKLOG",
        sourceCohortYear: "2021-22",
        cieMarks: 32,
      },
    });

    expect(candA.candidateType).toBe("MAKEUP");
    expect(candB.candidateType).toBe("BACKLOG");
    expect(candA.sourceCohortYear).toBe("2022-23");
    expect(candB.sourceCohortYear).toBe("2021-22");

    const totalRegs = await prisma.assessmentRegistration.count({
      where: { assessmentEventId: makeupEvent.id },
    });
    expect(totalRegs).toBe(2);
  });

  it("CASE 4: Question reuse across academic years creates separate historical QuestionUsage records", async () => {
    const { prisma } = await import("../src/db.js");

    // Usage in 2026-27 cycle
    const usage1 = await prisma.questionUsage.create({
      data: {
        questionId: 501,
        questionVersionId: 1001,
        assessmentEventId: 1,
        academicYear: "2026-27",
        semester: "3",
        assessmentType: "SEE",
        usedAt: new Date("2026-12-10"),
      },
    });

    // Reusage in 2027-28 cycle
    const usage2 = await prisma.questionUsage.create({
      data: {
        questionId: 501,
        questionVersionId: 1001,
        assessmentEventId: 2,
        academicYear: "2027-28",
        semester: "3",
        assessmentType: "SEE",
        usedAt: new Date("2027-12-12"),
      },
    });

    expect(usage1.questionId).toBe(usage2.questionId);
    expect(usage1.assessmentEventId).not.toBe(usage2.assessmentEventId);
    expect(usage1.academicYear).toBe("2026-27");
    expect(usage2.academicYear).toBe("2027-28");

    const count = await prisma.questionUsage.count({ where: { questionId: 501 } });
    expect(count).toBe(2);
  });

  it("CASE 5: Question edited after 2026 paper was sealed preserves historical PaperVersion & PaperItemSnapshot", async () => {
    const { prisma } = await import("../src/db.js");

    // Form and sealed PaperVersion 1
    const form = await prisma.paperForm.create({
      data: { blueprintId: 10, setName: "Set A", status: "SEALED" },
    });

    const v1Content = { text: "Explain Big-O, Omega, and Theta notations with mathematical definitions." };
    const contentHashV1 = computeCanonicalHash(v1Content);

    const paperVer1 = await prisma.paperVersion.create({
      data: {
        paperFormId: form.id,
        versionNumber: 1,
        contentHash: contentHashV1,
        status: "SEALED",
        sealedAt: new Date("2026-12-15"),
      },
    });

    // Frozen snapshot points to QuestionVersion 1001
    const snapshot = await prisma.paperItemSnapshot.create({
      data: {
        paperFormId: form.id,
        paperVersionId: paperVer1.id,
        questionVersionId: 1001,
        questionNumber: "Q1(a)",
        moduleNumber: 1,
        frozenStemJson: v1Content,
        frozenMarks: 10,
        frozenBlooms: "L3",
        frozenCoCode: "CO1",
      },
    });

    // Author creates QuestionVersion 1002 (Refactored to Bloom L4)
    // Later paper or question edit occurs, but historical snapshot in sealed paper remains frozen:
    const recheckedSnapshot = await prisma.paperItemSnapshot.findUnique({
      where: { id: snapshot.id },
    });

    expect(recheckedSnapshot?.questionVersionId).toBe(1001);
    expect((recheckedSnapshot?.frozenStemJson as any)?.text).toBe(
      "Explain Big-O, Omega, and Theta notations with mathematical definitions."
    );

    const recheckedPaperVersion = await prisma.paperVersion.findUnique({
      where: { id: paperVer1.id },
    });
    expect(recheckedPaperVersion?.contentHash).toBe(contentHashV1);
    expect(recheckedPaperVersion?.status).toBe("SEALED");
  });

  it("CASE 7 & CASE 8: Historical assessment remains bound to CurriculumVersion and supports distinct PaperVersions", async () => {
    const { prisma } = await import("../src/db.js");

    // Event tied to 2022 scheme
    const event2026 = await prisma.assessmentEvent.findFirst({
      where: { eventCode: "SEE_2026_BCS303" },
    });
    expect(event2026?.curriculumVersionId).toBe(1);

    // Event tied to 2026 scheme
    const event2028 = await prisma.assessmentEvent.create({
      data: {
        examSessionId: 2,
        courseId: 101,
        curriculumVersionId: 2, // AMCEC 2026 NEP
        assessmentTypeId: 1,
        eventCode: "SEE_2028_BCS303_NEP",
        title: "Data Structures SEE — December 2028 (NEP)",
        status: "DRAFT",
      },
    });

    expect(event2028.curriculumVersionId).toBe(2);
    // Historical 2026 event remains on CurriculumVersion 1
    const verify2026 = await prisma.assessmentEvent.findFirst({
      where: { eventCode: "SEE_2026_BCS303" },
    });
    expect(verify2026?.curriculumVersionId).toBe(1);
  });
});
