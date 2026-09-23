import { prisma } from "../db.js";
import { AppError } from "../middleware/error.js";

export interface CreateAcademicYearInput {
  code: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  isCurrent?: boolean;
}

export interface CreateExamSessionInput {
  academicTermId: number;
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
    return prisma.academicYear.findMany({
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

    return prisma.academicYear.create({
      data: {
        code: input.code,
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        isCurrent: input.isCurrent ?? false,
      },
    });
  }

  /**
   * List Academic Terms with associated academic year and sessions
   */
  static async listAcademicTerms(academicYearId?: number) {
    return prisma.academicTerm.findMany({
      where: academicYearId ? { academicYearId } : undefined,
      include: {
        academicYear: true,
        _count: {
          select: { examSessions: true, courseOfferings: true },
        },
      },
      orderBy: [{ academicYear: { startDate: "desc" } }, { termType: "asc" }],
    });
  }

  /**
   * List all Assessment Types (CIE_1, SEE, MAKEUP, etc.)
   */
  static async listAssessmentTypes() {
    return prisma.assessmentType.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  /**
   * List all Curriculum Versions
   */
  static async listCurriculumVersions() {
    return prisma.curriculumVersion.findMany({
      include: {
        program: {
          include: { department: true },
        },
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
    return prisma.examSession.findMany({
      where: {
        ...(filters?.academicTermId && { academicTermId: filters.academicTermId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.assessmentTypeId && { assessmentTypeId: filters.assessmentTypeId }),
      },
      include: {
        academicTerm: {
          include: { academicYear: true },
        },
        assessmentType: true,
        regulationProfile: true,
        _count: {
          select: { assessmentEvents: true },
        },
      },
      orderBy: { startDate: "desc" },
    });
  }

  /**
   * Create an Exam Session
   */
  static async createExamSession(input: CreateExamSessionInput) {
    return prisma.examSession.create({
      data: {
        academicTermId: input.academicTermId,
        assessmentTypeId: input.assessmentTypeId,
        regulationProfileId: input.regulationProfileId,
        code: input.code,
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: "PLANNING",
      },
      include: {
        academicTerm: { include: { academicYear: true } },
        assessmentType: true,
      },
    });
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
      throw new AppError("Exam session not found", 404);
    }

    const allowed = validTransitions[session.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError(
        `Invalid status transition from '${session.status}' to '${status}'. Allowed: ${allowed.join(", ") || "none"}`,
        400
      );
    }

    return prisma.examSession.update({
      where: { id: sessionId },
      data: { status },
      include: {
        academicTerm: { include: { academicYear: true } },
        assessmentType: true,
      },
    });
  }

  /**
   * Get Exam Session Details with all its Assessment Events & stats
   */
  static async getExamSessionDetails(sessionId: number) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
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
            _count: {
              select: { registrations: true, questionUsages: true },
            },
          },
          orderBy: [{ scheduledDate: "asc" }, { course: { code: "asc" } }],
        },
      },
    });

    if (!session) {
      throw new AppError("Exam session not found", 404);
    }

    return session;
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
      throw new AppError("Exam session not found", 404);
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
            status: "DRAFT",
          },
        });
      }

      // Check or create PaperForms for each requested set
      for (const setCode of sets) {
        const existingForm = await prisma.paperForm.findFirst({
          where: {
            assessmentEventId: event.id,
            formCode: setCode,
          },
        });

        if (!existingForm) {
          const form = await prisma.paperForm.create({
            data: {
              assessmentEventId: event.id,
              formCode: setCode,
              status: "DRAFT",
            },
          });

          // Create initial PaperVersion v1
          await prisma.paperVersion.create({
            data: {
              paperFormId: form.id,
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
        registrations: {
          orderBy: { studentUsn: "asc" },
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
      throw new AppError("Assessment event not found", 404);
    }

    return event;
  }

  /**
   * Register candidates (Regular, Backlog, Makeup) for an assessment event
   */
  static async registerCandidates(eventId: number, candidates: CandidateRegistrationInput[]) {
    const event = await prisma.assessmentEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError("Assessment event not found", 404);
    }

    const created = [];
    for (const c of candidates) {
      const reg = await prisma.assessmentRegistration.upsert({
        where: {
          assessmentEventId_studentUsn: {
            assessmentEventId: eventId,
            studentUsn: c.studentUsn,
          },
        },
        update: {
          studentName: c.studentName,
          candidateType: c.candidateType || "REGULAR",
          cohortYear: c.cohortYear,
          eligible: c.eligible ?? true,
          remarks: c.remarks,
        },
        create: {
          assessmentEventId: eventId,
          studentUsn: c.studentUsn,
          studentName: c.studentName,
          candidateType: c.candidateType || "REGULAR",
          cohortYear: c.cohortYear,
          eligible: c.eligible ?? true,
          remarks: c.remarks,
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
            registrations: true,
            questionUsages: {
              include: {
                questionVersion: {
                  include: { question: true },
                },
              },
            },
          },
          orderBy: { examSession: { startDate: "desc" } },
        },
      },
    });

    if (!course) {
      throw new AppError("Course not found", 404);
    }

    // Aggregate statistics across academic years
    const timeline = course.assessmentEvents.map((evt) => {
      const session = evt.examSession;
      const term = session?.academicTerm;
      const year = term?.academicYear;

      const totalCandidates = evt.registrations.length;
      const backlogCount = evt.registrations.filter((r) => r.candidateType === "BACKLOG").length;
      const regularCount = evt.registrations.filter((r) => r.candidateType === "REGULAR").length;

      // Extract unique questions used in this event
      const usedQuestionIds = new Set(
        evt.questionUsages.map((u) => u.questionVersion.questionId)
      );

      return {
        eventId: evt.id,
        academicYear: year?.code || "N/A",
        term: term?.termType || "N/A",
        sessionName: session?.name || "N/A",
        assessmentType: session?.assessmentType?.code || "N/A",
        scheduledDate: evt.scheduledDate,
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
      courseCode: course.code,
      courseName: course.name,
      department: course.department.name,
      totalEvents: course.assessmentEvents.length,
      curriculumSchemes: course.curriculumCourses.map((cc) => cc.curriculumVersion.schemeName),
      timeline,
    };
  }
}
