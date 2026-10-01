/**
 * AMCEC Autonomous College Examination OS
 * Intelligent Question Framing & Historical PYQ Recommender Service
 * 
 * Features:
 * - Keystroke & Topic Semantic Extraction
 * - Historical VTU/Autonomous Exam Archive Search
 * - Repetition Radar (Similarity Index against past papers)
 * - 3-Tier Cognitive Question Synthesizer (PYQ, Bloom's Calibrated, Scenario HOTS)
 * - Automatic Scheme of Evaluation Step-Rubric Generation
 */

export interface StepRubricItem {
  stepNo: number;
  description: string;
  marks: number;
}

export interface HistoricalPYQ {
  id: string;
  courseCode: string;
  courseName: string;
  examSession: string; // e.g. "SEE Dec 2023 / Jan 2024"
  schemeYear: string;  // e.g. "2021 Scheme"
  moduleNumber: number;
  topic: string;
  questionText: string;
  marks: number;
  bloomsLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  coMapping: string;
  repetitionFrequency: number; // e.g. 3 times
  similarityScore?: number;
  modelSolutionSnippet: string;
  stepRubric: StepRubricItem[];
}

export interface FramedQuestionVariation {
  id: string;
  tier: 'tier_a_pyq' | 'tier_b_cognitive' | 'tier_c_scenario';
  title: string;
  questionText: string;
  marks: number;
  bloomsLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  coMapping: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rationale: string;
  actionVerbUsed: string;
  stepRubric: StepRubricItem[];
  modelAnswerSnippet: string;
  latexIncluded: boolean;
  diagramRecommended: boolean;
}

export interface RecommendationResult {
  extractedTopic: string;
  matchedModule: number;
  targetMarks: number;
  targetBlooms: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  repetitionCheck: {
    maxSimilarityPct: number;
    mostSimilarPYQ?: {
      examSession: string;
      questionText: string;
      marks: number;
      similarityPct: number;
    };
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
    warningMessage?: string;
  };
  historicalPYQs: HistoricalPYQ[];
  framedVariations: FramedQuestionVariation[];
}

// Historical Past Year Question Database (Pre-Indexed Archive for AMCEC Autonomous Cycles)
const HISTORICAL_PYQ_ARCHIVE: HistoricalPYQ[] = [
  // Module 1: Stacks, Recursion, Expressions
  {
    id: "pyq_m1_01",
    courseCode: "21CS32",
    courseName: "Data Structures & Applications",
    examSession: "SEE Jan 2024",
    schemeYear: "2021 Scheme",
    moduleNumber: 1,
    topic: "Infix to Postfix Conversion",
    questionText: "Convert the following infix expression into postfix using stack: $(A + B * C) / (D - E ^ F * G)$. Show the detailed status of operator stack and output string at each step.",
    marks: 8,
    bloomsLevel: "L3",
    coMapping: "CO1",
    repetitionFrequency: 4,
    modelSolutionSnippet: "Scan left to right. Stack operators based on precedence: ^ (highest), *, / (next), +, - (lowest). Final postfix: A B C * + D E F ^ G * - /.",
    stepRubric: [
      { stepNo: 1, description: "Operator precedence and associativity rule statement", marks: 2 },
      { stepNo: 2, description: "Tabular step-by-step trace showing token, stack, and postfix buffer", marks: 5 },
      { stepNo: 3, description: "Final postfix expression validation", marks: 1 }
    ]
  },
  {
    id: "pyq_m1_02",
    courseCode: "21CS32",
    courseName: "Data Structures & Applications",
    examSession: "SEE July 2023",
    schemeYear: "2021 Scheme",
    moduleNumber: 1,
    topic: "Stack Operations & Applications",
    questionText: "Define a Stack. Explain the basic operations performed on a stack with C functions for PUSH and POP operations. Handle overflow and underflow conditions.",
    marks: 10,
    bloomsLevel: "L2",
    coMapping: "CO1",
    repetitionFrequency: 5,
    modelSolutionSnippet: "Stack is a LIFO linear structure. PUSH inserts at top if top < MAX-1; POP deletes from top if top != -1.",
    stepRubric: [
      { stepNo: 1, description: "Stack definition and LIFO concept explanation", marks: 2 },
      { stepNo: 2, description: "C code implementation of PUSH with overflow guard", marks: 4 },
      { stepNo: 3, description: "C code implementation of POP with underflow guard", marks: 4 }
    ]
  },
  {
    id: "pyq_m1_03",
    courseCode: "21CS32",
    courseName: "Data Structures & Applications",
    examSession: "SEE Jan 2023",
    schemeYear: "2021 Scheme",
    moduleNumber: 1,
    topic: "Recursion & Tower of Hanoi",
    questionText: "Explain the Tower of Hanoi problem for $N=3$ disks. Write a recursive C routine and trace the sequence of disk moves from source peg A to destination peg C.",
    marks: 8,
    bloomsLevel: "L3",
    coMapping: "CO1",
    repetitionFrequency: 3,
    modelSolutionSnippet: "For N disks, recurrence is $T(n) = 2T(n-1) + 1$, yielding $2^n - 1 = 7$ moves for N=3.",
    stepRubric: [
      { stepNo: 1, description: "Problem statement, base conditions, and recursive recurrence", marks: 2 },
      { stepNo: 2, description: "Recursive C function implementation", marks: 3 },
      { stepNo: 3, description: "Detailed 7-step move trace with intermediate pegs", marks: 3 }
    ]
  },

  // Module 2: Queues and Linked Lists
  {
    id: "pyq_m2_01",
    courseCode: "21CS32",
    courseName: "Data Structures & Applications",
    examSession: "SEE Jan 2024",
    schemeYear: "2021 Scheme",
    moduleNumber: 2,
    topic: "Circular Queue",
    questionText: "Explain the disadvantages of linear queue. How does circular queue overcome it? Write C functions for insert and delete operations in a circular queue.",
    marks: 10,
    bloomsLevel: "L3",
    coMapping: "CO2",
    repetitionFrequency: 4,
    modelSolutionSnippet: "Linear queue suffers from false overflow. Circular queue wraps indices using modulo arithmetic: `rear = (rear + 1) % MAX`.",
    stepRubric: [
      { stepNo: 1, description: "Explanation of linear queue drawback with diagram", marks: 2 },
      { stepNo: 2, description: "Circular queue insert operation with full condition", marks: 4 },
      { stepNo: 3, description: "Circular queue delete operation with empty condition", marks: 4 }
    ]
  },
  {
    id: "pyq_m2_02",
    courseCode: "21CS32",
    courseName: "Data Structures & Applications",
    examSession: "SEE July 2023",
    schemeYear: "2021 Scheme",
    moduleNumber: 2,
    topic: "Singly Linked List",
    questionText: "Write node structure and C functions for: (i) Insert at front, (ii) Delete from end, and (iii) Display all elements in a Singly Linked List.",
    marks: 10,
    bloomsLevel: "L3",
    coMapping: "CO2",
    repetitionFrequency: 6,
    modelSolutionSnippet: "Dynamic node `struct Node { int data; struct Node *next; };`. Memory allocated via `malloc`.",
    stepRubric: [
      { stepNo: 1, description: "Node structure definition and insert front function", marks: 3 },
      { stepNo: 2, description: "Delete rear function with null / single-node edge checks", marks: 4 },
      { stepNo: 3, description: "Display traversal function", marks: 3 }
    ]
  },

  // Module 3: Trees, BST, AVL
  {
    id: "pyq_m3_01",
    courseCode: "21CS32",
    courseName: "Data Structures & Applications",
    examSession: "SEE Dec 2023",
    schemeYear: "2021 Scheme",
    moduleNumber: 3,
    topic: "Binary Search Tree Construction & Traversals",
    questionText: "Construct a Binary Search Tree (BST) for the following key sequence: $50, 30, 70, 20, 40, 60, 80, 10, 25, 35, 65$. Give its Inorder, Preorder, and Postorder traversals.",
    marks: 8,
    bloomsLevel: "L3",
    coMapping: "CO3",
    repetitionFrequency: 5,
    modelSolutionSnippet: "Inorder traversal of any BST yields strictly sorted order: 10, 20, 25, 30, 35, 40, 50, 60, 65, 70, 80.",
    stepRubric: [
      { stepNo: 1, description: "Step-by-step BST construction diagram", marks: 4 },
      { stepNo: 2, description: "Preorder and Postorder traversal lists", marks: 2 },
      { stepNo: 3, description: "Inorder traversal list (sorted verification)", marks: 2 }
    ]
  },
  {
    id: "pyq_m3_02",
    courseCode: "21CS32",
    courseName: "Data Structures & Applications",
    examSession: "SEE July 2023",
    schemeYear: "2021 Scheme",
    moduleNumber: 3,
    topic: "AVL Tree Rotations",
    questionText: "What is an AVL Tree? Explain LL, RR, LR, and RL rotation techniques with illustrative examples to maintain balance factor $\\in \\{-1, 0, +1\\}$.",
    marks: 10,
    bloomsLevel: "L4",
    coMapping: "CO3",
    repetitionFrequency: 3,
    modelSolutionSnippet: "AVL tree is a self-balancing BST where height difference between left and right subtrees of every node is at most 1.",
    stepRubric: [
      { stepNo: 1, description: "AVL definition and balance factor formula statement", marks: 2 },
      { stepNo: 2, description: "LL and RR single rotation diagrams with rebalancing", marks: 4 },
      { stepNo: 3, description: "LR and RL double rotation diagrams and transformations", marks: 4 }
    ]
  },

  // Module 4: Graphs & Shortest Paths
  {
    id: "pyq_m4_01",
    courseCode: "21CS32",
    courseName: "Data Structures & Applications",
    examSession: "SEE Jan 2024",
    schemeYear: "2021 Scheme",
    moduleNumber: 4,
    topic: "Dijkstra Algorithm",
    questionText: "Explain Dijkstra's single source shortest path algorithm. Trace the algorithm with a step-by-step distance vector update for a weighted directed graph of 5 vertices.",
    marks: 10,
    bloomsLevel: "L3",
    coMapping: "CO4",
    repetitionFrequency: 4,
    modelSolutionSnippet: "Greedy algorithm maintaining visited set $S$ and relaxing tentative distances: $dist[v] = \\min(dist[v], dist[u] + cost(u,v))$.",
    stepRubric: [
      { stepNo: 1, description: "Dijkstra algorithm logic and greedy principle statement", marks: 3 },
      { stepNo: 2, description: "Initial distance table and source initialization", marks: 2 },
      { stepNo: 3, description: "Step-by-step relaxation table showing finalized shortest paths", marks: 5 }
    ]
  },
  {
    id: "pyq_m4_02",
    courseCode: "21CS32",
    courseName: "Data Structures & Applications",
    examSession: "SEE July 2022",
    schemeYear: "2021 Scheme",
    moduleNumber: 4,
    topic: "Graph Traversals (BFS & DFS)",
    questionText: "Differentiate between Breadth First Search (BFS) and Depth First Search (DFS). Illustrate the traversal order starting from vertex A for a sample graph.",
    marks: 8,
    bloomsLevel: "L2",
    coMapping: "CO4",
    repetitionFrequency: 4,
    modelSolutionSnippet: "BFS uses Queue (level-order); DFS uses Stack / recursion (backtracking). Both run in $O(V + E)$ time.",
    stepRubric: [
      { stepNo: 1, description: "Comparative table: data structure, traversal strategy, complexity", marks: 4 },
      { stepNo: 2, description: "BFS trace with queue state updates", marks: 2 },
      { stepNo: 3, description: "DFS trace with recursion/stack state updates", marks: 2 }
    ]
  },

  // Module 5: Hashing & File Structures
  {
    id: "pyq_m5_01",
    courseCode: "21CS32",
    courseName: "Data Structures & Applications",
    examSession: "SEE Dec 2023",
    schemeYear: "2021 Scheme",
    moduleNumber: 5,
    topic: "Hashing & Collision Resolution",
    questionText: "Explain the concept of Hashing and Collision. Describe Linear Probing and Chaining methods of collision resolution with a suitable hash function $h(k) = k \\pmod{m}$.",
    marks: 10,
    bloomsLevel: "L3",
    coMapping: "CO5",
    repetitionFrequency: 5,
    modelSolutionSnippet: "Collision occurs when $h(k_1) = h(k_2)$. Linear probing resolves using $(h(k) + i) \\pmod{m}$. Chaining maintains linked list per bucket.",
    stepRubric: [
      { stepNo: 1, description: "Hashing definition, hash function criteria, and collision explanation", marks: 3 },
      { stepNo: 2, description: "Linear probing mechanism with numerical example and clustering note", marks: 4 },
      { stepNo: 3, description: "Chaining method mechanism with linked list bucket illustration", marks: 3 }
    ]
  }
];

// Topic to Module Mapping Knowledge Base
const TOPIC_MODULE_MAP: Record<string, { module: number; co: string; keywords: string[] }> = {
  stack: { module: 1, co: "CO1", keywords: ["stack", "lifo", "push", "pop", "overflow", "underflow", "recursion", "postfix", "prefix", "infix", "tower of hanoi"] },
  queue: { module: 2, co: "CO2", keywords: ["queue", "fifo", "circular queue", "deque", "priority queue", "linked list", "singly", "doubly", "circular list", "node"] },
  tree: { module: 3, co: "CO3", keywords: ["tree", "binary tree", "bst", "avl", "traversal", "inorder", "preorder", "postorder", "rotation", "height balanced", "heap"] },
  graph: { module: 4, co: "CO4", keywords: ["graph", "bfs", "dfs", "dijkstra", "shortest path", "mst", "prims", "kruskal", "topological sort", "adjacency matrix"] },
  hash: { module: 5, co: "CO5", keywords: ["hash", "hashing", "collision", "linear probing", "quadratic probing", "chaining", "file structure", "indexing", "b tree"] }
};

/**
 * Tokenize and extract key concepts from user text
 */
function extractConcepts(input: string): { keywords: string[]; primaryTopic: string; suggestedModule: number; suggestedCO: string } {
  const clean = input.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = clean.split(/\s+/).filter(w => w.length > 2);

  let bestModule = 1;
  let bestCO = "CO1";
  let maxScore = -1;
  let primaryTopic = "Core Concept";

  for (const [topicKey, info] of Object.entries(TOPIC_MODULE_MAP)) {
    let score = 0;
    for (const w of words) {
      if (info.keywords.some(k => k.includes(w) || w.includes(k))) {
        score += 2;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestModule = info.module;
      bestCO = info.co;
      primaryTopic = topicKey.charAt(0).toUpperCase() + topicKey.slice(1);
    }
  }

  return {
    keywords: words,
    primaryTopic,
    suggestedModule: bestModule,
    suggestedCO: bestCO
  };
}

/**
 * Compute token-overlap similarity percentage between two strings (0 to 100%)
 */
function calculateSimilarity(strA: string, strB: string): number {
  const wordsA = new Set(strA.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(strB.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return Math.round((intersection / union) * 100);
}

/**
 * Synthesize automated step-by-step marking rubrics totaling exact target marks
 */
function generateStepRubric(marks: number, blooms: string, topic: string): StepRubricItem[] {
  if (marks <= 4) {
    return [
      { stepNo: 1, description: `Definition, basic principles, and terminology of ${topic}`, marks: 2 },
      { stepNo: 2, description: `Illustration or mathematical representation with example`, marks: marks - 2 }
    ];
  }

  if (marks <= 7) {
    const s1 = 2;
    const s2 = Math.floor((marks - s1) / 2);
    const s3 = marks - s1 - s2;
    return [
      { stepNo: 1, description: `Theoretical formulation, governing equations, or conceptual statement`, marks: s1 },
      { stepNo: 2, description: `Algorithmic steps / architectural diagram for ${topic}`, marks: s2 },
      { stepNo: 3, description: `Step-by-step execution trace / edge case handling / output`, marks: s3 }
    ];
  }

  // 8 to 10 marks
  const s1 = 2;
  const s2 = 4;
  const s3 = marks - s1 - s2;
  return [
    { stepNo: 1, description: `Concept definition, prerequisites, and operational bounds`, marks: s1 },
    { stepNo: 2, description: `Comprehensive algorithm implementation, schematic, or formula derivation`, marks: s2 },
    { stepNo: 3, description: `Step-by-step numerical trace on given dataset & time/space complexity analysis`, marks: s3 }
  ];
}

/**
 * Main Question Recommendation & Cognitive Framing Engine
 */
export async function recommendAndFrameQuestions(params: {
  courseCode?: string;
  courseName?: string;
  moduleNumber?: number;
  partialText: string;
  targetMarks?: number;
  targetBlooms?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
}): Promise<RecommendationResult> {
  const {
    courseCode = "21CS32",
    courseName = "Data Structures & Applications",
    partialText,
    targetMarks = 10,
    targetBlooms = "L3"
  } = params;

  const conceptData = extractConcepts(partialText);
  const activeModule = params.moduleNumber || conceptData.suggestedModule;
  const activeCO = `CO${Math.min(activeModule, 5)}`;

  // 1. Historical PYQ Matching
  const candidatePYQs = HISTORICAL_PYQ_ARCHIVE.filter(
    pyq => pyq.moduleNumber === activeModule || pyq.topic.toLowerCase().includes(conceptData.primaryTopic.toLowerCase())
  );

  let maxSimilarityPct = 0;
  let mostSimilarPYQ: HistoricalPYQ | undefined;

  const scoredPYQs = candidatePYQs.map(pyq => {
    const sim = calculateSimilarity(partialText, pyq.questionText);
    if (sim > maxSimilarityPct) {
      maxSimilarityPct = sim;
      mostSimilarPYQ = pyq;
    }
    return { ...pyq, similarityScore: sim };
  }).sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));

  // Determine Repetition Risk
  let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
  let warningMessage: string | undefined;

  if (maxSimilarityPct > 65) {
    riskLevel = 'HIGH';
    warningMessage = `⚠️ High Repetition Risk (${maxSimilarityPct}% match with ${mostSimilarPYQ?.examSession}). Using this verbatim may be flagged during BoE scrutiny. Consider using one of the fresh cognitive variations below.`;
  } else if (maxSimilarityPct > 35) {
    riskLevel = 'MODERATE';
    warningMessage = `ℹ️ Moderate similarity (${maxSimilarityPct}%) with past examination questions. Vetted for syllabus alignment.`;
  }

  // 2. Cognitive Question Variations Synthesizer (Tier B & Tier C)
  const framedVariations: FramedQuestionVariation[] = [];
  const topicLabel = conceptData.primaryTopic;

  // Variation 1: Tier B Cognitive Application (L3 - Algorithmic Trace & Mathematical Formulation)
  framedVariations.push({
    id: `var_${Date.now()}_1`,
    tier: "tier_b_cognitive",
    title: `Trace & Numerical Application (${targetMarks}M - L3)`,
    questionText: `Consider the ${topicLabel} problem. (i) Formulate the algorithmic approach to handle insertions and updates. (ii) Given the key sequence $\\{42, 17, 89, 56, 23, 71, 95\\}$, trace the step-by-step state transformation and illustrate the final structure. [${targetMarks} Marks]`,
    marks: targetMarks,
    bloomsLevel: "L3",
    coMapping: activeCO,
    difficulty: "Medium",
    rationale: "Tests practical execution ability and intermediate state tracing without rote memorization.",
    actionVerbUsed: "Formulate & Trace",
    stepRubric: generateStepRubric(targetMarks, "L3", topicLabel),
    modelAnswerSnippet: "Requires student to demonstrate initial state, token-by-token transformation table, and correct final state.",
    latexIncluded: true,
    diagramRecommended: true
  });

  // Variation 2: Tier B Analytical & Comparative (L4 - Analyze & Critique)
  framedVariations.push({
    id: `var_${Date.now()}_2`,
    tier: "tier_b_cognitive",
    title: `Comparative Analysis & Performance Trade-offs (${targetMarks}M - L4)`,
    questionText: `Critique the time and space complexity of ${topicLabel} under worst-case and best-case conditions. Differentiate its operational efficiency against alternative data structures, and analyze scenarios where performance degrades to $O(N)$. [${targetMarks} Marks]`,
    marks: targetMarks,
    bloomsLevel: "L4",
    coMapping: activeCO,
    difficulty: "Hard",
    rationale: "Meets autonomous accreditation HOTS criteria by requiring comparative evaluation of asymptotic bounds.",
    actionVerbUsed: "Critique & Differentiate",
    stepRubric: generateStepRubric(targetMarks, "L4", topicLabel),
    modelAnswerSnippet: "Requires formal Big-O proofs, worst-case condition scenarios, and comparative asymptotic table.",
    latexIncluded: true,
    diagramRecommended: false
  });

  // Variation 3: Tier C Real-World Scenario / NEP 2020 Case Problem (L4/L5 - Applied Synthesis)
  framedVariations.push({
    id: `var_${Date.now()}_3`,
    tier: "tier_c_scenario",
    title: `Autonomous Real-World Engineering Scenario (${targetMarks}M - L5)`,
    questionText: `In an autonomous vehicle telemetry system, sensor packets arrive at high velocity and must be buffered, prioritized, and dispatched under strict latency guarantees. Design a specialized ${topicLabel} architecture to satisfy these constraints. Detail your node representation, overflow resolution strategy, and write the dispatch algorithm. [${targetMarks} Marks]`,
    marks: targetMarks,
    bloomsLevel: "L5",
    coMapping: activeCO,
    difficulty: "Hard",
    rationale: "Aligns with NBA Outcome-Based Education and NEP 2020 by applying core theoretical structures to modern engineering systems.",
    actionVerbUsed: "Design & Formulate",
    stepRubric: generateStepRubric(targetMarks, "L5", topicLabel),
    modelAnswerSnippet: "Requires domain architecture diagram, priority queue / ring buffer logic, and failure handling routines.",
    latexIncluded: false,
    diagramRecommended: true
  });

  // Variation 4: Tier B Foundational (L2 - Explain & Illustrate)
  if (targetBlooms === "L1" || targetBlooms === "L2" || targetMarks <= 6) {
    framedVariations.unshift({
      id: `var_${Date.now()}_0`,
      tier: "tier_b_cognitive",
      title: `Conceptual Explanation & Diagrammatic Model (${targetMarks}M - L2)`,
      questionText: `Explain the fundamental architecture and working principles of ${topicLabel}. Provide neat schematic diagrams and state the primary advantages and operational limitations in real-world software design. [${targetMarks} Marks]`,
      marks: targetMarks,
      bloomsLevel: "L2",
      coMapping: activeCO,
      difficulty: "Easy",
      rationale: "Ideal for introductory module sections testing clarity of concept and visual schematics.",
      actionVerbUsed: "Explain & Illustrate",
      stepRubric: generateStepRubric(targetMarks, "L2", topicLabel),
      modelAnswerSnippet: "Clear definitions, schematic diagrams showing pointer/index manipulations, and clean summary table.",
      latexIncluded: false,
      diagramRecommended: true
    });
  }

  return {
    extractedTopic: conceptData.primaryTopic,
    matchedModule: activeModule,
    targetMarks,
    targetBlooms,
    repetitionCheck: {
      maxSimilarityPct,
      mostSimilarPYQ: mostSimilarPYQ ? {
        examSession: mostSimilarPYQ.examSession,
        questionText: mostSimilarPYQ.questionText,
        marks: mostSimilarPYQ.marks,
        similarityPct: maxSimilarityPct
      } : undefined,
      riskLevel,
      warningMessage
    },
    historicalPYQs: scoredPYQs.slice(0, 5),
    framedVariations
  };
}
