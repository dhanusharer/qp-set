import { prisma } from "../db.js";
import { ApiError } from "../middleware/error.js";

export interface CreateAcademicYearInput {
  code: string;
  name?: string;
  startDate: string | Date;
  endDate: string | Date;
  isCurrent?: boolean;
}

export interface CreateExamSessionInput {
  academicYearId?: number;
  academicTermId?: number;
  assessmentTypeId: number;
  regulationProfileId?: number;
  code: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
}

export interface SessionWizardInput {
  courseIds: number[];
  blueprintTemplateId?: number;
  paperTemplateId?: number;
  setsToGenerate?: string[]; // e.g. ["SET_A", "SET_B", "RESERVE"]
}

export interface CandidateRegistrationInput {
  studentUsn: string;
  studentName: string;
  candidateType?: "REGULAR" | "BACKLOG" | "MAKEUP" | "GRADE_IMPROVEMENT";
  cohortYear?: string;
  eligible?: boolean;
  remarks?: string;
}

export class AcademicCycleService {
  /**
   * List all Academic Years with their terms and session counts
   */
  static async listAcademicYears() {
    const rawYears = await prisma.academicYear.findMany({
      include: {
        terms: {
          include: {
            _count: {
              select: { examSessions: true, courseOfferings: true },
            },
          },
          orderBy: { termType: "asc" },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return rawYears.map((y) => ({
      ...y,
      code: y.yearCode,
      name: `Academic Year ${y.yearCode}`,
      terms: y.terms.map((t) => ({
        ...t,
        code: t.termCode,
        name: t.displayName,
      })),
    }));
  }

  /**
   * Create a new Academic Year
   */
  static async createAcademicYear(input: CreateAcademicYearInput) {
    if (input.isCurrent) {
      await prisma.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const created = await prisma.academicYear.create({
      data: {
        yearCode: input.code,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        isCurrent: input.isCurrent ?? false,
      },
    });

    return {
      ...created,
      code: created.yearCode,
      name: `Academic Year ${created.yearCode}`,
    };
  }

  /**
   * List Academic Terms with associated academic year and sessions
   */
  static async listAcademicTerms(academicYearId?: number) {
    const rawTerms = await prisma.academicTerm.findMany({
      where: academicYearId ? { academicYearId } : undefined,
      include: {
        academicYear: true,
        _count: {
          select: { examSessions: true, courseOfferings: true },
        },
      },
      orderBy: [{ academicYear: { startDate: "desc" } }, { termType: "asc" }],
    });

    return rawTerms.map((t) => ({
      ...t,
      code: t.termCode,
      name: t.displayName,
      academicYear: {
        ...t.academicYear,
        code: t.academicYear.yearCode,
        name: `Academic Year ${t.academicYear.yearCode}`,
      },
    }));
  }

  /**
   * List all Assessment Types (CIE_1, SEE, MAKEUP, etc.)
   */
  static async listAssessmentTypes() {
    const types = await prisma.assessmentType.findMany({
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });

    return types.map((t) => ({
      ...t,
      name: t.displayName,
    }));
  }

  /**
   * List all Curriculum Versions
   */
  static async listCurriculumVersions() {
    return prisma.curriculumVersion.findMany({
      include: {
        _count: {
          select: { curriculumCourses: true },
        },
      },
      orderBy: { effectiveFromYear: "desc" },
    });
  }

  /**
   * List Exam Sessions with filter support
   */
  static async listExamSessions(filters?: {
    academicTermId?: number;
    status?: string;
    assessmentTypeId?: number;
  }) {
    const rawSessions = await prisma.examSession.findMany({
      where: {
        ...(filters?.academicTermId && { academicTermId: filters.academicTermId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.assessmentTypeId && { assessmentTypeId: filters.assessmentTypeId }),
      },
      include: {
        academicYear: true,
        academicTerm: {
          include: { academicYear: true },
        },
        assessmentType: true,
        regulationProfile: true,
        _count: {
          select: { assessmentEvents: true },
        },
      },
      orderBy: { startsAt: "desc" },
    });

    return rawSessions.map((s) => ({
      ...s,
      code: s.sessionCode,
      startDate: s.startsAt,
      endDate: s.endsAt,
      academicTerm: s.academicTerm
        ? {
            ...s.academicTerm,
            code: s.academicTerm.termCode,
            name: s.academicTerm.displayName,
            academicYear: {
              ...s.academicTerm.academicYear,
              code: s.academicTerm.academicYear.yearCode,
              name: `Academic Year ${s.academicTerm.academicYear.yearCode}`,
            },
          }
        : undefined,
      assessmentType: {
        ...s.assessmentType,
        name: s.assessmentType.displayName,
      },
    }));
  }

  /**
   * Create an Exam Session
   */
  static async createExamSession(input: CreateExamSessionInput) {
    let yearId = input.academicYearId;
    if (!yearId && input.academicTermId) {
      const term = await prisma.academicTerm.findUnique({
        where: { id: input.academicTermId },
      });
      if (term) yearId = term.academicYearId;
    }

    if (!yearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });
      if (!currentYear) {
        throw new ApiError(400, "Academic year could not be determined");
      }
      yearId = currentYear.id;
    }

    const created = await prisma.examSession.create({
      data: {
        academicYearId: yearId,
        academicTermId: input.academicTermId,
        assessmentTypeId: input.assessmentTypeId,
        regulationProfileId: input.regulationProfileId,
        sessionCode: input.code,
        name: input.name,
        startsAt: new Date(input.startDate),
        endsAt: new Date(input.endDate),
        status: "PLANNING",
      },
      include: {
        academicYear: true,
        academicTerm: { include: { academicYear: true } },
        assessmentType: true,
      },
    });

    return {
      ...created,
      code: created.sessionCode,
      startDate: created.startsAt,
      endDate: created.endsAt,
    };
  }

  /**
   * Update Exam Session Status with state machine validation
   */
  static async updateExamSessionStatus(sessionId: number, status: string) {
    const validTransitions: Record<string, string[]> = {
      PLANNING: ["ACTIVE", "CANCELLED"],
      ACTIVE: ["SCRUTINY", "PLANNING", "CANCELLED"],
      SCRUTINY: ["SEALED", "ACTIVE"],
      SEALED: ["CONCLUDED", "SCRUTINY"],
      CONCLUDED: [],
      CANCELLED: ["PLANNING"],
    };

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ApiError(404, "Exam session not found");
    }

    const allowed = validTransitions[session.status] || [];
    if (!allowed.includes(status)) {
      throw new ApiError(
        400,
        `Invalid status transition from '${session.status}' to '${status}'. Allowed: ${allowed.join(", ") || "none"}`
      );
    }

    const updated = await prisma.examSession.update({
      where: { id: sessionId },
      data: { status },
      include: {
        academicTerm: { include: { academicYear: true } },
        assessmentType: true,
      },
    });

    return {
      ...updated,
      code: updated.sessionCode,
      startDate: updated.startsAt,
      endDate: updated.endsAt,
    };
  }

  /**
   * Get Exam Session Details with all its Assessment Events & stats
   */
  static async getExamSessionDetails(sessionId: number) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        academicYear: true,
        academicTerm: {
          include: { academicYear: true },
        },
        assessmentType: true,
        regulationProfile: true,
        assessmentEvents: {
          include: {
            course: {
              include: { department: true },
            },
            courseOffering: true,
            paperForms: {
              include: {
                versions: {
                  orderBy: { versionNumber: "desc" },
                  take: 1,
                },
              },
            },
            blueprints: true,
            candidates: true,
            _count: {
              select: { candidates: true, questionUsages: true },
            },
          },
          orderBy: [{ scheduledAt: "asc" }, { course: { courseCode: "asc" } }],
        },
      },
    });

    if (!session) {
      throw new ApiError(404, "Exam session not found");
    }

    return {
      ...session,
      code: session.sessionCode,
      startDate: session.startsAt,
      endDate: session.endsAt,
      academicTerm: session.academicTerm
        ? {
            ...session.academicTerm,
            code: session.academicTerm.termCode,
            name: session.academicTerm.displayName,
            academicYear: {
              ...session.academicTerm.academicYear,
              code: session.academicTerm.academicYear.yearCode,
              name: `Academic Year ${session.academicTerm.academicYear.yearCode}`,
            },
          }
        : undefined,
      assessmentType: {
        ...session.assessmentType,
        name: session.assessmentType.displayName,
      },
      assessmentEvents: session.assessmentEvents.map((e) => ({
        ...e,
        scheduledDate: e.scheduledAt,
        course: {
          ...e.course,
          code: e.course.courseCode,
          name: e.course.courseName,
        },
        paperForms: e.paperForms.map((pf) => ({
          ...pf,
          formCode: pf.setName,
        })),
        _count: {
          registrations: e.candidates.length,
          questionUsages: e._count.questionUsages,
        },
      })),
    };
  }

  /**
   * Wizard: Batch initialize AssessmentEvents and PaperForms for courses in a session
   */
  static async generateSessionEventsWizard(sessionId: number, input: SessionWizardInput) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { assessmentType: true, academicTerm: true },
    });

    if (!session) {
      throw new ApiError(404, "Exam session not found");
    }

    const sets = input.setsToGenerate && input.setsToGenerate.length > 0
      ? input.setsToGenerate
      : ["SET_A", "SET_B", "RESERVE"];

    const createdEvents = [];

    for (const courseId of input.courseIds) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course) continue;

      const eventCode = `${session.sessionCode}_${course.courseCode}_${Date.now() % 10000}`;
      const title = `${course.courseName} (${course.courseCode}) — ${session.name}`;

      // Check if event already exists for this course in this session
      let event = await prisma.assessmentEvent.findFirst({
        where: {
          examSessionId: sessionId,
          courseId,
        },
      });

      if (!event) {
        event = await prisma.assessmentEvent.create({
          data: {
            examSessionId: sessionId,
            courseId,
            eventCode,
            title,
            status: "DRAFT",
          },
        });
      }

      // Check or create Blueprint for this event
      let blueprint = await prisma.assessmentBlueprint.findFirst({
        where: { assessmentEventId: event.id },
      });

      if (!blueprint) {
        blueprint = await prisma.assessmentBlueprint.create({
          data: {
            assessmentEventId: event.id,
            title: `Blueprint for ${course.courseCode} (${session.name})`,
            examType: session.assessmentType?.code || "SEE",
            totalMarks: 100,
            durationMinutes: 180,
          },
        });
      }

      // Check or create PaperForms for each requested set
      for (const setCode of sets) {
        const setNameFormatted = setCode.replace("_", " ");
        let existingForm = await prisma.paperForm.findFirst({
          where: {
            blueprintId: blueprint.id,
            setName: setNameFormatted,
          },
        });

        if (!existingForm) {
          existingForm = await prisma.paperForm.create({
            data: {
              blueprintId: blueprint.id,
              assessmentEventId: event.id,
              setName: setNameFormatted,
              status: "DRAFT",
            },
          });

          // Create initial PaperVersion v1
          await prisma.paperVersion.create({
            data: {
              paperFormId: existingForm.id,
              versionNumber: 1,
              status: "DRAFT",
              contentHash: `INIT-${event.id}-${setCode}-v1`,
            },
          });
        }
      }

      createdEvents.push(event);
    }

    return {
      message: `Batch initialized ${createdEvents.length} assessment events with parallel forms [${sets.join(", ")}]`,
      eventsCount: createdEvents.length,
      sessionId,
    };
  }

  /**
   * Get detailed Operational Workspace for an Assessment Event
   */
  static async getAssessmentEventDetails(eventId: number) {
    const event = await prisma.assessmentEvent.findUnique({
      where: { id: eventId },
      include: {
        examSession: {
          include: {
            academicTerm: { include: { academicYear: true } },
            assessmentType: true,
            regulationProfile: true,
          },
        },
        course: {
          include: {
            department: true,
            outcomes: true,
            curriculumCourses: {
              include: { curriculumVersion: true },
            },
          },
        },
        courseOffering: true,
        blueprints: {
          include: {
            sections: {
              include: { rules: true },
            },
          },
        },
        paperForms: {
          include: {
            versions: {
              include: {
                itemSnapshots: {
                  include: { question: true },
                },
                usages: {
                  include: {
                    questionVersion: {
                      include: { question: true },
                    },
                  },
                },
              },
              orderBy: { versionNumber: "desc" },
            },
          },
        },
        candidates: {
          orderBy: { usn: "asc" },
        },
        questionUsages: {
          include: {
            questionVersion: {
              include: { question: true },
            },
          },
        },
      },
    });

    if (!event) {
      throw new ApiError(404, "Assessment event not found");
    }

    return {
      ...event,
      course: {
        ...event.course,
        code: event.course.courseCode,
        name: event.course.courseName,
      },
      examSession: {
        ...event.examSession,
        code: event.examSession.sessionCode,
        startDate: event.examSession.startsAt,
        endDate: event.examSession.endsAt,
        academicTerm: event.examSession.academicTerm
          ? {
              ...event.examSession.academicTerm,
              code: event.examSession.academicTerm.termCode,
              name: event.examSession.academicTerm.displayName,
              academicYear: {
                ...event.examSession.academicTerm.academicYear,
                code: event.examSession.academicTerm.academicYear.yearCode,
                name: `Academic Year ${event.examSession.academicTerm.academicYear.yearCode}`,
              },
            }
          : {
              name: "General Term",
              termType: "REGULAR",
              academicYear: { code: "2025-26", name: "AY 2025-26" },
            },
        assessmentType: {
          ...event.examSession.assessmentType,
          name: event.examSession.assessmentType?.displayName || "SEE",
        },
      },
      paperForms: event.paperForms.map((pf) => ({
        ...pf,
        formCode: pf.setName,
      })),
      registrations: event.candidates.map((c) => ({
        ...c,
        studentUsn: c.usn,
        cohortYear: c.sourceCohortYear,
        eligible: c.isEligible,
      })),
    };
  }

  /**
   * Register candidates (Regular, Backlog, Makeup) for an assessment event
   */
  static async registerCandidates(eventId: number, candidates: CandidateRegistrationInput[]) {
    const event = await prisma.assessmentEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new ApiError(404, "Assessment event not found");
    }

    const created = [];
    for (const c of candidates) {
      const reg = await prisma.assessmentRegistration.upsert({
        where: {
          assessmentEventId_usn: {
            assessmentEventId: eventId,
            usn: c.studentUsn,
          },
        },
        update: {
          studentName: c.studentName,
          candidateType: c.candidateType || "REGULAR",
          sourceCohortYear: c.cohortYear,
          isEligible: c.eligible ?? true,
        },
        create: {
          assessmentEventId: eventId,
          usn: c.studentUsn,
          studentName: c.studentName,
          candidateType: c.candidateType || "REGULAR",
          sourceCohortYear: c.cohortYear,
          isEligible: c.eligible ?? true,
        },
      });
      created.push(reg);
    }

    return {
      message: `Registered ${created.length} candidates for event #${eventId}`,
      candidates: created,
    };
  }

  /**
   * Multi-Year Historical Course Matrix
   * Returns question reuse, paper sets, exam sessions, and Bloom distribution over time
   */
  static async getHistoricalCourseMatrix(courseId: number) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        department: true,
        outcomes: true,
        curriculumCourses: {
          include: { curriculumVersion: true },
        },
        assessmentEvents: {
          include: {
            examSession: {
              include: {
                academicYear: true,
                academicTerm: { include: { academicYear: true } },
                assessmentType: true,
              },
            },
            paperForms: {
              include: {
                versions: {
                  include: {
                    itemSnapshots: true,
                  },
                },
              },
            },
            candidates: true,
            questionUsages: {
              include: {
                questionVersion: {
                  include: { question: true },
                },
              },
            },
          },
          orderBy: { examSession: { startsAt: "desc" } },
        },
      },
    });

    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    // Aggregate statistics across academic years
    const timeline = course.assessmentEvents.map((evt) => {
      const session = evt.examSession;
      const term = session?.academicTerm;
      const year = term?.academicYear || session?.academicYear;

      const totalCandidates = evt.candidates.length;
      const backlogCount = evt.candidates.filter((r) => r.candidateType === "BACKLOG").length;
      const regularCount = evt.candidates.filter((r) => r.candidateType === "REGULAR").length;

      // Extract unique questions used in this event
      const usedQuestionIds = new Set(
        evt.questionUsages.map((u) => u.questionVersion.questionId)
      );

      return {
        eventId: evt.id,
        academicYear: year?.yearCode || "N/A",
        term: term?.termType || "N/A",
        sessionName: session?.name || "N/A",
        assessmentType: session?.assessmentType?.code || "N/A",
        scheduledDate: evt.scheduledAt,
        status: evt.status,
        paperFormsCount: evt.paperForms.length,
        totalCandidates,
        regularCount,
        backlogCount,
        uniqueQuestionsUsed: usedQuestionIds.size,
      };
    });

    return {
      courseId: course.id,
      courseCode: course.courseCode,
      courseName: course.courseName,
      department: course.department?.name || "Autonomous Engineering",
      totalEvents: course.assessmentEvents.length,
      curriculumSchemes: course.curriculumCourses.map((cc) => cc.curriculumVersion.schemeName),
      timeline,
    };
  }
}
