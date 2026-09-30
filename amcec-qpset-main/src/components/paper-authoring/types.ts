export interface RubricStep {
  id: string;
  stepNo: number;
  description: string;
  marks: number;
}

export interface QuestionSubpart {
  id: string;
  partLabel: string; // "(a)", "(b)", "(c)", "(d)"
  text: string;
  latexEquation?: string;
  svgDiagram?: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
  marks: number;
  bloomsLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  coMapping: string; // "CO1", "CO2", "CO3", "CO4", "CO5"
  difficulty: 'Easy' | 'Medium' | 'Hard';
  bankQuestionId?: number;
  markingRubric: RubricStep[];
  modelAnswer?: string;
}

export interface FullQuestion {
  id: string;
  questionNumber: number; // 1, 2, 3 ... 10
  subparts: QuestionSubpart[];
}

export interface ExamModule {
  id: string;
  moduleNumber: number; // 1 to 5
  moduleTitle: string;
  questionA: FullQuestion; // e.g. Q1
  questionB: FullQuestion; // e.g. Q2 (OR choice)
}

export interface QuestionPaperContent {
  institution: string;
  courseCode: string;
  courseName: string;
  semester: string;
  examType: string;
  maxMarks: number;
  durationMinutes: number;
  instructions: string;
  modules: ExamModule[];
  metadata?: {
    facultyId?: number;
    facultyName?: string;
    lastSavedAt?: string;
    submittedAt?: string;
  };
}

export const BLOOMS_LABELS: Record<string, { name: string; category: 'LOTS' | 'HOTS'; color: string }> = {
  L1: { name: 'Remember', category: 'LOTS', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  L2: { name: 'Understand', category: 'LOTS', color: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
  L3: { name: 'Apply', category: 'HOTS', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  L4: { name: 'Analyze', category: 'HOTS', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  L5: { name: 'Evaluate', category: 'HOTS', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  L6: { name: 'Create', category: 'HOTS', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};

export const CO_OPTIONS = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'];

export function createDefaultSubpart(label: string, marks: number = 10, blooms: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' = 'L3', co: string = 'CO1'): QuestionSubpart {
  return {
    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    partLabel: label,
    text: '',
    marks,
    bloomsLevel: blooms,
    coMapping: co,
    difficulty: ['L1', 'L2'].includes(blooms) ? 'Easy' : ['L3', 'L4'].includes(blooms) ? 'Medium' : 'Hard',
    markingRubric: [
      { id: `r1_${Date.now()}`, stepNo: 1, description: 'Fundamental definition, concept statement, or primary formula', marks: Math.ceil(marks * 0.3) },
      { id: `r2_${Date.now()}`, stepNo: 2, description: 'Step-by-step derivation, architectural diagram, or algorithm', marks: Math.floor(marks * 0.7) },
    ],
    modelAnswer: '',
  };
}

export function createDefaultModule(moduleNumber: number, title?: string): ExamModule {
  const qNumA = (moduleNumber - 1) * 2 + 1;
  const qNumB = (moduleNumber - 1) * 2 + 2;
  const co = `CO${Math.min(moduleNumber, 5)}`;

  return {
    id: `mod_${moduleNumber}`,
    moduleNumber,
    moduleTitle: title || `Module ${moduleNumber}: Core Engineering Topics`,
    questionA: {
      id: `q_${qNumA}`,
      questionNumber: qNumA,
      subparts: [
        createDefaultSubpart('(a)', 10, 'L2', co),
        createDefaultSubpart('(b)', 10, 'L3', co),
      ],
    },
    questionB: {
      id: `q_${qNumB}`,
      questionNumber: qNumB,
      subparts: [
        createDefaultSubpart('(a)', 10, 'L3', co),
        createDefaultSubpart('(b)', 10, 'L4', co),
      ],
    },
  };
}

export function createInitialPaperStructure(courseCode: string = 'BCS303', courseName: string = 'Data Structures & Applications'): QuestionPaperContent {
  const defaultTitles = [
    'Linear Data Structures: Stacks, Recursion & Expression Evaluation',
    'Queues, Deques & Linked Lists Implementations',
    'Non-Linear Structures: Binary Search Trees & AVL Balancing',
    'Graph Algorithms: Shortest Paths, MST & Network Traversals',
    'Advanced Hashing Techniques, Collision Resolution & File Structures',
  ];

  return {
    institution: 'AMC Engineering College (Autonomous)',
    courseCode,
    courseName,
    semester: '3',
    examType: 'SEE',
    maxMarks: 100,
    durationMinutes: 180,
    instructions: '1. Answer any FIVE full questions, choosing ONE full question from each module.\n2. Use of approved non-programmable scientific calculator is permitted.\n3. Assume missing data suitably, if any.',
    modules: [1, 2, 3, 4, 5].map((num) => createDefaultModule(num, defaultTitles[num - 1])),
    metadata: {
      lastSavedAt: new Date().toISOString(),
    },
  };
}

export function parseOrConvertPaperContent(
  rawContent: any,
  courseCode: string = 'BCS303',
  courseName: string = 'Data Structures & Applications',
  semester: string = '3',
  maxMarks: number = 100
): QuestionPaperContent {
  if (!rawContent) {
    return createInitialPaperStructure(courseCode, courseName);
  }

  // If already structured QuestionPaperContent
  if (typeof rawContent === 'object' && Array.isArray(rawContent.modules) && rawContent.modules.length > 0) {
    return {
      institution: rawContent.institution || 'AMC Engineering College (Autonomous)',
      courseCode: rawContent.courseCode || courseCode,
      courseName: rawContent.courseName || courseName,
      semester: rawContent.semester || semester,
      examType: rawContent.examType || (maxMarks === 40 ? 'CIE' : 'SEE'),
      maxMarks: rawContent.maxMarks || maxMarks,
      durationMinutes: rawContent.durationMinutes || (maxMarks === 40 ? 120 : 180),
      instructions: rawContent.instructions || '1. Answer any FIVE full questions, choosing ONE full question from each module.\n2. Use of approved non-programmable scientific calculator is permitted.\n3. Assume missing data suitably, if any.',
      modules: rawContent.modules,
      metadata: rawContent.metadata || {},
    };
  }

  // If legacy array (ModuleData[] or InternalModuleData[])
  if (Array.isArray(rawContent) && rawContent.length > 0) {
    const convertedModules: ExamModule[] = rawContent.map((m: any, idx: number) => {
      const modNum = m.id || idx + 1;
      const qNumA = modNum * 2 - 1;
      const qNumB = modNum * 2;
      const co = `CO${Math.min(modNum, 5)}`;

      const subpartsA: QuestionSubpart[] = [];
      const subpartsB: QuestionSubpart[] = [];

      // Check legacy ModuleData (q1a, q1b, q2a, q2b)
      if (m.questions?.q1a) {
        subpartsA.push({
          id: m.questions.q1a.id || `sub_${qNumA}_a`,
          partLabel: '(a)',
          text: m.questions.q1a.text || '',
          marks: Number(m.questions.q1a.marks) || 10,
          bloomsLevel: m.questions.q1a.bloomsLevel || 'L2',
          coMapping: m.questions.q1a.coMapping || co,
          difficulty: ['L1', 'L2'].includes(m.questions.q1a.bloomsLevel) ? 'Easy' : 'Medium',
          markingRubric: [{ id: `r_${qNumA}a_1`, stepNo: 1, description: 'Core explanation & steps', marks: Number(m.questions.q1a.marks) || 10 }],
        });
      }
      if (m.questions?.q1b) {
        subpartsA.push({
          id: m.questions.q1b.id || `sub_${qNumA}_b`,
          partLabel: '(b)',
          text: m.questions.q1b.text || '',
          marks: Number(m.questions.q1b.marks) || 10,
          bloomsLevel: m.questions.q1b.bloomsLevel || 'L3',
          coMapping: m.questions.q1b.coMapping || co,
          difficulty: ['L1', 'L2'].includes(m.questions.q1b.bloomsLevel) ? 'Easy' : 'Medium',
          markingRubric: [{ id: `r_${qNumA}b_1`, stepNo: 1, description: 'Core explanation & steps', marks: Number(m.questions.q1b.marks) || 10 }],
        });
      }
      if (m.questions?.q2a) {
        subpartsB.push({
          id: m.questions.q2a.id || `sub_${qNumB}_a`,
          partLabel: '(a)',
          text: m.questions.q2a.text || '',
          marks: Number(m.questions.q2a.marks) || 10,
          bloomsLevel: m.questions.q2a.bloomsLevel || 'L2',
          coMapping: m.questions.q2a.coMapping || co,
          difficulty: ['L1', 'L2'].includes(m.questions.q2a.bloomsLevel) ? 'Easy' : 'Medium',
          markingRubric: [{ id: `r_${qNumB}a_1`, stepNo: 1, description: 'Core explanation & steps', marks: Number(m.questions.q2a.marks) || 10 }],
        });
      }
      if (m.questions?.q2b) {
        subpartsB.push({
          id: m.questions.q2b.id || `sub_${qNumB}_b`,
          partLabel: '(b)',
          text: m.questions.q2b.text || '',
          marks: Number(m.questions.q2b.marks) || 10,
          bloomsLevel: m.questions.q2b.bloomsLevel || 'L3',
          coMapping: m.questions.q2b.coMapping || co,
          difficulty: ['L1', 'L2'].includes(m.questions.q2b.bloomsLevel) ? 'Easy' : 'Medium',
          markingRubric: [{ id: `r_${qNumB}b_1`, stepNo: 1, description: 'Core explanation & steps', marks: Number(m.questions.q2b.marks) || 10 }],
        });
      }

      // Check legacy internal format (q1: {a, b, c}, q2: {a, b, c})
      if (m.questions?.q1?.a) {
        ['a', 'b', 'c'].forEach((p) => {
          const item = m.questions.q1[p];
          if (item) {
            subpartsA.push({
              id: item.id || `sub_${qNumA}_${p}`,
              partLabel: `(${p})`,
              text: item.text || '',
              marks: Number(item.marks) || (p === 'a' ? 4 : 3),
              bloomsLevel: item.bloomsLevel || 'L2',
              coMapping: item.coMapping || co,
              difficulty: ['L1', 'L2'].includes(item.bloomsLevel) ? 'Easy' : 'Medium',
              markingRubric: [{ id: `r_${qNumA}${p}_1`, stepNo: 1, description: 'Evaluation criteria', marks: Number(item.marks) || 3 }],
            });
          }
        });
      }
      if (m.questions?.q2?.a) {
        ['a', 'b', 'c'].forEach((p) => {
          const item = m.questions.q2[p];
          if (item) {
            subpartsB.push({
              id: item.id || `sub_${qNumB}_${p}`,
              partLabel: `(${p})`,
              text: item.text || '',
              marks: Number(item.marks) || (p === 'a' ? 4 : 3),
              bloomsLevel: item.bloomsLevel || 'L2',
              coMapping: item.coMapping || co,
              difficulty: ['L1', 'L2'].includes(item.bloomsLevel) ? 'Easy' : 'Medium',
              markingRubric: [{ id: `r_${qNumB}${p}_1`, stepNo: 1, description: 'Evaluation criteria', marks: Number(item.marks) || 3 }],
            });
          }
        });
      }

      return {
        id: `mod_${modNum}`,
        moduleNumber: modNum,
        moduleTitle: m.title || `Module ${modNum}: Core Topics`,
        questionA: {
          id: `q_${qNumA}`,
          questionNumber: qNumA,
          subparts: subpartsA.length > 0 ? subpartsA : [
            createDefaultSubpart('(a)', 10, 'L2', co),
            createDefaultSubpart('(b)', 10, 'L3', co),
          ],
        },
        questionB: {
          id: `q_${qNumB}`,
          questionNumber: qNumB,
          subparts: subpartsB.length > 0 ? subpartsB : [
            createDefaultSubpart('(a)', 10, 'L2', co),
            createDefaultSubpart('(b)', 10, 'L3', co),
          ],
        },
      };
    });

    return {
      institution: 'AMC Engineering College (Autonomous)',
      courseCode,
      courseName,
      semester,
      examType: maxMarks === 40 ? 'CIE' : 'SEE',
      maxMarks,
      durationMinutes: maxMarks === 40 ? 120 : 180,
      instructions: '1. Answer any FIVE full questions, choosing ONE full question from each module.\n2. Use of approved non-programmable scientific calculator is permitted.\n3. Assume missing data suitably, if any.',
      modules: convertedModules,
      metadata: {
        lastSavedAt: new Date().toISOString(),
      },
    };
  }

  return createInitialPaperStructure(courseCode, courseName);
}
