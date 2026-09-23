import { prisma } from "../db.js";

export async function runAcademicCycleBackfill() {
  console.log("=== AMCEC Academic Cycle & Exam Session Backfill Migration ===");

  // 1. Institution Master
  const inst = await prisma.institution.upsert({
    where: { code: "AMCEC" },
    update: {},
    create: {
      code: "AMCEC",
      name: "AMC Engineering College (Autonomous)",
      city: "Bengaluru",
      state: "Karnataka",
      isAutonomous: true,
    },
  });
  console.log("✓ Institution:", inst.name);

  // Link existing departments to institution
  await prisma.department.updateMany({
    where: { institutionId: null },
    data: { institutionId: inst.id },
  });

  // 2. Academic Program
  const cseDept = await prisma.department.findFirst({ where: { code: "CSE" } });
  let programId: number | null = null;
  if (cseDept) {
    const prog = await prisma.program.upsert({
      where: { code: "BE_CSE" },
      update: {},
      create: {
        departmentId: cseDept.id,
        code: "BE_CSE",
        name: "B.E. in Computer Science & Engineering",
        degreeType: "UNDERGRADUATE",
      },
    });
    programId = prog.id;
    console.log("✓ Program:", prog.name);
  }

  // 3. Academic Years (Multi-Year containers)
  const yearsData = [
    { yearCode: "2024-25", startDate: new Date("2024-08-01"), endDate: new Date("2025-07-31"), isCurrent: false },
    { yearCode: "2025-26", startDate: new Date("2025-08-01"), endDate: new Date("2026-07-31"), isCurrent: true },
    { yearCode: "2026-27", startDate: new Date("2026-08-01"), endDate: new Date("2027-07-31"), isCurrent: false },
  ];

  const yearMap = new Map<string, number>();
  for (const yd of yearsData) {
    const ay = await prisma.academicYear.upsert({
      where: { yearCode: yd.yearCode },
      update: { isCurrent: yd.isCurrent },
      create: { ...yd, institutionId: inst.id },
    });
    yearMap.set(ay.yearCode, ay.id);
  }
  console.log("✓ Academic Years:", Array.from(yearMap.keys()).join(", "));

  // 4. Academic Terms
  const currentAyId = yearMap.get("2025-26")!;
  const termsData = [
    { termCode: "ODD_2025", termType: "ODD", displayName: "Odd Semester 2025-26", startDate: new Date("2025-08-16"), endDate: new Date("2025-12-31"), isCurrent: false },
    { termCode: "EVEN_2026", termType: "EVEN", displayName: "Even Semester 2025-26", startDate: new Date("2026-01-15"), endDate: new Date("2026-05-31"), isCurrent: true },
    { termCode: "SUMMER_2026", termType: "SUMMER", displayName: "Summer Make-up Term 2025-26", startDate: new Date("2026-06-01"), endDate: new Date("2026-07-31"), isCurrent: false },
  ];

  const termMap = new Map<string, number>();
  for (const td of termsData) {
    const at = await prisma.academicTerm.upsert({
      where: { academicYearId_termCode: { academicYearId: currentAyId, termCode: td.termCode } },
      update: { isCurrent: td.isCurrent },
      create: { ...td, academicYearId: currentAyId },
    });
    termMap.set(at.termCode, at.id);
  }
  console.log("✓ Academic Terms:", Array.from(termMap.keys()).join(", "));

  // 5. Configurable Assessment Types
  const assessmentTypesData = [
    { code: "CIE_1", displayName: "Continuous Internal Evaluation 1", category: "FORMATIVE", defaultWeight: 15, isTerminal: false },
    { code: "CIE_2", displayName: "Continuous Internal Evaluation 2", category: "FORMATIVE", defaultWeight: 15, isTerminal: false },
    { code: "CIE_3", displayName: "Continuous Internal Evaluation 3", category: "FORMATIVE", defaultWeight: 20, isTerminal: false },
    { code: "SEE", displayName: "Semester End Examination", category: "SUMMATIVE", defaultWeight: 50, isTerminal: true },
    { code: "MAKEUP", displayName: "Summer Make-up Examination", category: "REMEDIAL", defaultWeight: 50, isTerminal: true },
    { code: "SUPPLEMENTARY", displayName: "Supplementary Examination", category: "REMEDIAL", defaultWeight: 50, isTerminal: true },
    { code: "SPECIAL", displayName: "Special Examination", category: "REMEDIAL", defaultWeight: 50, isTerminal: true },
  ];

  const assessmentTypeMap = new Map<string, number>();
  for (const at of assessmentTypesData) {
    const record = await prisma.assessmentType.upsert({
      where: { code: at.code },
      update: { displayName: at.displayName, category: at.category, defaultWeight: at.defaultWeight, isTerminal: at.isTerminal },
      create: at,
    });
    assessmentTypeMap.set(record.code, record.id);
  }
  console.log("✓ Assessment Types:", Array.from(assessmentTypeMap.keys()).join(", "));

  // 6. Curriculum Version & Curriculum Course Mapping
  const curVer = await prisma.curriculumVersion.upsert({
    where: { code: "VTU_2022_SCHEME" },
    update: {},
    create: {
      programId: programId,
      code: "VTU_2022_SCHEME",
      name: "VTU Autonomous Engineering 2022 CBCS Scheme",
      schemeYear: "2022",
      effectiveFromYear: "2022-23",
      isActive: true,
    },
  });
  console.log("✓ Curriculum Version:", curVer.name);

  // Map all existing Courses to CurriculumCourse
  const allCourses = await prisma.course.findMany();
  for (const c of allCourses) {
    await prisma.curriculumCourse.upsert({
      where: { curriculumVersionId_courseId: { curriculumVersionId: curVer.id, courseId: c.id } },
      update: {},
      create: {
        curriculumVersionId: curVer.id,
        courseId: c.id,
        semester: c.semester || "6",
        credits: c.credits || 4,
        isElective: false,
      },
    });
  }
  console.log(`✓ Mapped ${allCourses.length} canonical courses to Curriculum Version`);

  // 7. Standard Paper Template
  const paperTemplate = await prisma.paperTemplate.upsert({
    where: { code: "AMCEC_AUTONOMOUS_SEE_STD" },
    update: {},
    create: {
      code: "AMCEC_AUTONOMOUS_SEE_STD",
      name: "AMCEC Standard Autonomous SEE Layout",
      confidentialText: "CONFIDENTIAL — AMCEC STRONG ROOM VAULT",
      watermarkPattern: "SERIALIZED_STAGGERED",
      isDefault: true,
    },
  });
  console.log("✓ Paper Template:", paperTemplate.name);

  // 8. Standard Blueprint Template
  const bpTemplate = await prisma.blueprintTemplate.upsert({
    where: { code: "VTU_100M_5MOD_CHOICE" },
    update: {},
    create: {
      code: "VTU_100M_5MOD_CHOICE",
      name: "VTU Standard 100 Marks 5-Module Choice Template",
      totalMarks: 100,
      durationMinutes: 180,
      instructions: "Answer any FIVE full questions, choosing ONE full question from each module.",
    },
  });

  // Seed default 5 sections if missing
  const existingBpSections = await prisma.blueprintTemplateSection.findMany({
    where: { templateId: bpTemplate.id },
  });
  if (existingBpSections.length === 0) {
    for (let m = 1; m <= 5; m++) {
      const bSec = await prisma.blueprintTemplateSection.create({
        data: {
          templateId: bpTemplate.id,
          sectionName: `Module ${m}`,
          compulsoryQuestions: 1,
          optionalQuestions: 1,
          marksPerQuestion: 20,
          orderIndex: m,
        },
      });
      await prisma.blueprintTemplateRule.create({
        data: {
          sectionId: bSec.id,
          targetUnit: m,
          requiredCount: 2,
        },
      });
    }
  }
  console.log("✓ Blueprint Template with 5 modular sections initialized");

  // 9. Link CourseOfferings to current AcademicTerm
  const evenTermId = termMap.get("EVEN_2026")!;
  await prisma.courseOffering.updateMany({
    where: { academicTermId: null },
    data: { academicTermId: evenTermId },
  });

  // 10. Operational Exam Sessions & Assessment Events Backfill
  const seeTypeId = assessmentTypeMap.get("SEE")!;
  const defaultSession = await prisma.examSession.upsert({
    where: { sessionCode: "SEE_MAY_2026" },
    update: {},
    create: {
      academicYearId: currentAyId,
      academicTermId: evenTermId,
      assessmentTypeId: seeTypeId,
      name: "Semester End Examination — May/June 2026",
      sessionCode: "SEE_MAY_2026",
      startsAt: new Date("2026-05-15"),
      endsAt: new Date("2026-06-15"),
      status: "ACTIVE",
    },
  });
  console.log("✓ Exam Session:", defaultSession.name);

  // Link existing Blueprints to AssessmentEvents
  const existingBlueprints = await prisma.assessmentBlueprint.findMany({
    include: {
      courseOffering: { include: { course: true } },
      paperForms: {
        include: {
          snapshots: true,
          versions: true,
        },
      },
    },
  });

  let backfilledEvents = 0;
  for (const bp of existingBlueprints) {
    if (!bp.courseOffering) continue;
    const course = bp.courseOffering.course;
    const eventCode = `SEE_2026_${course.courseCode || course.id}`;

    const event = await prisma.assessmentEvent.upsert({
      where: { eventCode },
      update: {
        courseOfferingId: bp.courseOfferingId,
        maximumMarks: bp.totalMarks,
        durationMinutes: bp.durationMinutes,
      },
      create: {
        examSessionId: defaultSession.id,
        courseId: course.id,
        curriculumVersionId: curVer.id,
        courseOfferingId: bp.courseOfferingId,
        assessmentTypeId: seeTypeId,
        paperTemplateId: paperTemplate.id,
        eventCode,
        title: `${course.courseName || course.courseCode} SEE — May/June 2026`,
        status: "SEALED",
        scheduledAt: new Date("2026-05-20"),
        maximumMarks: bp.totalMarks,
        durationMinutes: bp.durationMinutes,
      },
    });

    // Link blueprint to event
    await prisma.assessmentBlueprint.update({
      where: { id: bp.id },
      data: { assessmentEventId: event.id },
    });

    // Link paper forms to event and ensure PaperVersion exists
    for (const form of bp.paperForms) {
      await prisma.paperForm.update({
        where: { id: form.id },
        data: { assessmentEventId: event.id },
      });

      // If no PaperVersion exists, create PaperVersion 1 from existing snapshots
      if (form.versions.length === 0 && form.snapshots.length > 0) {
        const dummyHash = "CANONICAL_RFC8785_BACKFILL_V1";
        const pv = await prisma.paperVersion.create({
          data: {
            paperFormId: form.id,
            versionNumber: 1,
            changeReason: "Initial canonical paper assembly backfill",
            contentHash: dummyHash,
            status: form.status,
            sealedAt: form.status === "SEALED" ? new Date() : null,
          },
        });

        // Link snapshots to paperVersion
        await prisma.paperItemSnapshot.updateMany({
          where: { paperFormId: form.id },
          data: { paperVersionId: pv.id },
        });
      }
    }

    // Seed sample candidates for this event if none exist
    const candidateCount = await prisma.assessmentRegistration.count({
      where: { assessmentEventId: event.id },
    });
    if (candidateCount === 0) {
      const sampleCandidates = [
        { usn: "1AM22CS001", studentName: "Aarav Sharma", candidateType: "REGULAR", cieMarks: 46 },
        { usn: "1AM22CS002", studentName: "Ananya Rao", candidateType: "REGULAR", cieMarks: 44 },
        { usn: "1AM22CS003", studentName: "Bhavin Patel", candidateType: "REGULAR", cieMarks: 41 },
        { usn: "1AM21CS089", studentName: "Varun Reddy", candidateType: "BACKLOG", sourceCohortYear: "2021-22", cieMarks: 32 },
        { usn: "1AM22CS010", studentName: "Ishaan Deshmukh", candidateType: "MAKEUP", sourceCohortYear: "2022-23", cieMarks: 40 },
      ];
      for (const sc of sampleCandidates) {
        await prisma.assessmentRegistration.create({
          data: {
            assessmentEventId: event.id,
            usn: sc.usn,
            studentName: sc.studentName,
            candidateType: sc.candidateType,
            sourceCohortYear: sc.sourceCohortYear || "2022-23",
            sourceSemester: "6",
            cieMarks: sc.cieMarks,
            isEligible: true,
          },
        });
      }
    }

    backfilledEvents++;
  }

  if (backfilledEvents === 0) {
    const allCourses = await prisma.course.findMany({ take: 3 });
    for (const course of allCourses) {
      const eventCode = `SEE_2026_${course.courseCode || course.id}`;
      const event = await prisma.assessmentEvent.upsert({
        where: { eventCode },
        update: {},
        create: {
          examSessionId: defaultSession.id,
          courseId: course.id,
          curriculumVersionId: curVer.id,
          assessmentTypeId: seeTypeId,
          paperTemplateId: paperTemplate.id,
          eventCode,
          title: `${course.courseName || course.courseCode} SEE — May/June 2026`,
          status: "SEALED",
          scheduledAt: new Date("2026-05-20"),
          maximumMarks: 100,
          durationMinutes: 180,
        },
      });

      // Create Blueprint
      const bp = await prisma.assessmentBlueprint.create({
        data: {
          assessmentEventId: event.id,
          title: `Blueprint for ${course.courseCode} SEE`,
          examType: "SEE",
          totalMarks: 100,
          durationMinutes: 180,
        },
      });

      // Create PaperForms: Set A, Set B, Reserve Set
      for (const setName of ["Set A", "Set B", "Set C (Reserve)"]) {
        const form = await prisma.paperForm.create({
          data: {
            blueprintId: bp.id,
            assessmentEventId: event.id,
            setName,
            status: "SEALED",
          },
        });

        // Version 1
        await prisma.paperVersion.create({
          data: {
            paperFormId: form.id,
            versionNumber: 1,
            contentHash: `CANONICAL_RFC8785_${event.id}_${setName.replace(/\s+/g, '_')}_V1`,
            status: "SEALED",
            sealedAt: new Date(),
          },
        });
      }

      // Sample candidates
      const sampleCandidates = [
        { usn: `1AM22CS00${course.id}`, studentName: "Aarav Sharma", candidateType: "REGULAR", cieMarks: 46 },
        { usn: `1AM22CS01${course.id}`, studentName: "Ananya Rao", candidateType: "REGULAR", cieMarks: 44 },
        { usn: `1AM21CS08${course.id}`, studentName: "Varun Reddy", candidateType: "BACKLOG", sourceCohortYear: "2021-22", cieMarks: 32 },
        { usn: `1AM22CS02${course.id}`, studentName: "Ishaan Deshmukh", candidateType: "MAKEUP", sourceCohortYear: "2022-23", cieMarks: 40 },
      ];
      for (const sc of sampleCandidates) {
        await prisma.assessmentRegistration.create({
          data: {
            assessmentEventId: event.id,
            usn: sc.usn,
            studentName: sc.studentName,
            candidateType: sc.candidateType,
            sourceCohortYear: sc.sourceCohortYear,
            isEligible: true,
            cieMarks: sc.cieMarks,
          },
        });
      }
      backfilledEvents++;
    }
  }

  console.log(`✓ Backfilled ${backfilledEvents} AssessmentEvents linked to historical Blueprints & Papers`);
  console.log("=== Academic Cycle & Exam Session Backfill Migration Complete ===");
  return { success: true, backfilledEvents };
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith("backfillAcademicCycle.ts") || process.argv[1]?.endsWith("backfillAcademicCycle.js")) {
  runAcademicCycleBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Backfill failed:", err);
      process.exit(1);
    });
}
