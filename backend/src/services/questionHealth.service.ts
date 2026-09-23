import { QuestionHealthStatus } from "@prisma/client";

export interface QuestionHealthContext {
  sampleSize: number;
  difficultyIndex: number;
  discriminationIndex: number;
  timesUsed: number;
  recentUsesCount: number; // in last N exam cycles
  hasUnresolvedDuplicateFlag: boolean;
  isRetired: boolean;
}

export interface QuestionHealthEvaluation {
  status: QuestionHealthStatus;
  explanation: string;
  recommendations: string[];
  metrics: {
    sampleSize: number;
    difficultyIndex: number;
    discriminationIndex: number;
    timesUsed: number;
  };
}

/**
 * Deterministically evaluates question health status based on psychometrics,
 * exposure history, and duplicate similarity alerts.
 */
export function evaluateQuestionHealth(ctx: QuestionHealthContext): QuestionHealthEvaluation {
  const recommendations: string[] = [];

  // Check 1: Duplicate flags take precedence for integrity review
  if (ctx.hasUnresolvedDuplicateFlag) {
    return {
      status: "POSSIBLE_DUPLICATE",
      explanation: "High lexical or semantic overlap detected against existing question bank items.",
      recommendations: ["Review flagged similarity report in BoE Scrutiny interface", "Differentiate prompt or retire duplicate variant"],
      metrics: {
        sampleSize: ctx.sampleSize,
        difficultyIndex: ctx.difficultyIndex,
        discriminationIndex: ctx.discriminationIndex,
        timesUsed: ctx.timesUsed,
      },
    };
  }

  // Check 2: High exposure (used excessively in recent exam cycles)
  if (ctx.recentUsesCount >= 3) {
    return {
      status: "HIGH_EXPOSURE",
      explanation: `Item exposed ${ctx.recentUsesCount} times across recent exam cycles, exceeding institutional threshold (max 2).`,
      recommendations: ["Enforce minimum 2-cycle cooldown", "Author alternative question variant for current session"],
      metrics: {
        sampleSize: ctx.sampleSize,
        difficultyIndex: ctx.difficultyIndex,
        discriminationIndex: ctx.discriminationIndex,
        timesUsed: ctx.timesUsed,
      },
    };
  }

  // Check 3: Insufficient data (< 10 student responses)
  if (ctx.sampleSize < 10) {
    return {
      status: "INSUFFICIENT_DATA",
      explanation: `Sample size (${ctx.sampleSize} responses) is below statistical threshold (N >= 10) for robust CTT evaluation.`,
      recommendations: ["Awaiting student performance data from upcoming examination cycle"],
      metrics: {
        sampleSize: ctx.sampleSize,
        difficultyIndex: ctx.difficultyIndex,
        discriminationIndex: ctx.discriminationIndex,
        timesUsed: ctx.timesUsed,
      },
    };
  }

  // Check 4: Low or negative discrimination (D < 0.20)
  if (ctx.discriminationIndex < 0.20) {
    return {
      status: "LOW_DISCRIMINATION",
      explanation: `Discrimination index D = ${ctx.discriminationIndex.toFixed(2)} is defective (target D >= 0.25). Higher-scoring students do not outperform lower-scoring students on this item.`,
      recommendations: ["Examine question wording for ambiguities or trick distractor cues", "Revise marking scheme rubric clarity"],
      metrics: {
        sampleSize: ctx.sampleSize,
        difficultyIndex: ctx.difficultyIndex,
        discriminationIndex: ctx.discriminationIndex,
        timesUsed: ctx.timesUsed,
      },
    };
  }

  // Check 5: Extreme difficulty (too easy > 0.85 or too hard < 0.25)
  if (ctx.difficultyIndex < 0.25 || ctx.difficultyIndex > 0.85) {
    const isHard = ctx.difficultyIndex < 0.25;
    return {
      status: "REVIEW_REQUIRED",
      explanation: isHard
        ? `Difficulty index P = ${ctx.difficultyIndex.toFixed(2)} is excessively stringent (< 0.25). Less than 25% average score obtained.`
        : `Difficulty index P = ${ctx.difficultyIndex.toFixed(2)} provides minimal discrimination (> 0.85). Over 85% average score obtained.`,
      recommendations: [isHard ? "Simplify subpart complexity or adjust step-marking weight" : "Increase cognitive rigor to higher Bloom taxonomy level (L4/L5)"],
      metrics: {
        sampleSize: ctx.sampleSize,
        difficultyIndex: ctx.difficultyIndex,
        discriminationIndex: ctx.discriminationIndex,
        timesUsed: ctx.timesUsed,
      },
    };
  }

  // Check 6: HEALTHY item
  return {
    status: "HEALTHY",
    explanation: `Facility index P = ${ctx.difficultyIndex.toFixed(2)} (Balanced) and Discrimination D = ${ctx.discriminationIndex.toFixed(2)} (Good). Normal exposure rate (${ctx.timesUsed} lifetime uses).`,
    recommendations: ["Item approved for automated parallel-form paper assembly"],
    metrics: {
      sampleSize: ctx.sampleSize,
      difficultyIndex: ctx.difficultyIndex,
      discriminationIndex: ctx.discriminationIndex,
      timesUsed: ctx.timesUsed,
    },
  };
}
