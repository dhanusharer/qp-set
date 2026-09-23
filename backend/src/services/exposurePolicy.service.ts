/**
 * Item Exposure Policy Engine
 * Evaluates candidate questions against institutional reuse limits and cooldowns.
 * Produces structured selection rationale and exclusion explanations.
 */

export interface CandidateQuestionExposure {
  questionId: number;
  questionCode: string;
  status: string; // QuestionStatus
  timesUsed: number;
  recentExamUses: number;   // uses in last N exam sessions
  sessionsSinceLastUse: number | null; // null if never used
  healthStatus?: string;
}

export interface ExposurePolicyRules {
  maxUsesLastNExams: number;      // default: 2
  examWindowN: number;            // default: 4
  minExamsBetweenReuse: number;   // default: 2
  maxFormOverlapPercent: number;  // default: 15.0
  preferNeverUsed: boolean;       // default: true
  excludeRetired: boolean;        // default: true
}

export interface CandidateEvaluationResult {
  questionId: number;
  questionCode: string;
  eligible: boolean;
  priorityScore: number; // Higher is better (e.g. 100 for virgin, 50 for cooled down)
  reason: string;
  violations: string[];
}

export const DEFAULT_EXPOSURE_POLICY: ExposurePolicyRules = {
  maxUsesLastNExams: 2,
  examWindowN: 4,
  minExamsBetweenReuse: 2,
  maxFormOverlapPercent: 15.0,
  preferNeverUsed: true,
  excludeRetired: true,
};

/**
 * Evaluates a list of candidate questions against active exposure policy rules.
 */
export function evaluateItemExposure(
  candidates: CandidateQuestionExposure[],
  policy: ExposurePolicyRules = DEFAULT_EXPOSURE_POLICY
): CandidateEvaluationResult[] {
  return candidates.map((item) => {
    const violations: string[] = [];
    let priorityScore = 50;

    // Check 1: Exclude retired items
    if (policy.excludeRetired && item.status === "RETIRED") {
      violations.push("Item has been retired from active question bank rotation");
    }

    // Check 2: Max uses in last N exams
    if (item.recentExamUses >= policy.maxUsesLastNExams) {
      violations.push(
        `Exceeded maximum usage limit (${item.recentExamUses} uses in last ${policy.examWindowN} exam cycles; maximum allowed is ${policy.maxUsesLastNExams})`
      );
    }

    // Check 3: Minimum cooldown between reuses
    if (
      item.sessionsSinceLastUse !== null &&
      item.sessionsSinceLastUse < policy.minExamsBetweenReuse
    ) {
      violations.push(
        `Item is in cooldown: used ${item.sessionsSinceLastUse} session(s) ago; required cooldown is ${policy.minExamsBetweenReuse} sessions`
      );
    }

    // Priority scoring
    if (violations.length === 0) {
      if (item.timesUsed === 0 && policy.preferNeverUsed) {
        priorityScore = 100; // Maximum priority for virgin questions
      } else if (item.sessionsSinceLastUse !== null && item.sessionsSinceLastUse >= 4) {
        priorityScore = 80;  // Well-rested question
      } else {
        priorityScore = 60;  // Compliant question
      }
    } else {
      priorityScore = 0;
    }

    const eligible = violations.length === 0;
    let reason = "Item satisfies institutional exposure and cooldown policies.";
    if (!eligible) {
      reason = violations.join("; ");
    } else if (priorityScore === 100) {
      reason = "Virgin item: Never exposed in previous examination cycles (Priority 100).";
    }

    return {
      questionId: item.questionId,
      questionCode: item.questionCode,
      eligible,
      priorityScore,
      reason,
      violations,
    };
  });
}
