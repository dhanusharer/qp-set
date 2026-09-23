/**
 * Psychometric Intelligence Service
 * Computes Classical Test Theory (CTT) item statistics:
 * 1. Facility / Difficulty Index (p-value): Proportion of maximum possible score obtained
 * 2. Item Discrimination Index (D): Difference between upper 27% (H) and lower 27% (L) cohort performance
 * 3. Point-Biserial Correlation (r_pbis): Item score correlation with total examination score
 */

export interface StudentItemScore {
  studentUsn: string;
  itemScore: number;  // Score achieved on this question
  totalScore: number; // Student's total score on the whole examination
}

export interface PsychometricCalculationResult {
  sampleSize: number;
  averageScore: number;
  difficultyIndex: number;      // 0.00 to 1.00 (higher = easier)
  discriminationIndex: number;  // -1.00 to +1.00 (higher = better discriminator)
  pointBiserial: number | null; // Pearson r between item score and total score
  difficultyLabel: 'VERY_DIFFICULT' | 'MODERATE' | 'BALANCED' | 'VERY_EASY';
  discriminationLabel: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'POOR_OR_NEGATIVE';
}

/**
 * Calculates psychometrics for a specific question given an array of student responses.
 * @param responses Array of student item scores and total exam scores
 * @param maxItemMarks Maximum marks allocated for this question
 */
export function calculateItemPsychometrics(
  responses: StudentItemScore[],
  maxItemMarks: number
): PsychometricCalculationResult {
  const n = responses.length;
  if (n === 0 || maxItemMarks <= 0) {
    return {
      sampleSize: 0,
      averageScore: 0,
      difficultyIndex: 0.5,
      discriminationIndex: 0.3,
      pointBiserial: null,
      difficultyLabel: 'BALANCED',
      discriminationLabel: 'GOOD',
    };
  }

  // 1. Average & Difficulty Index (Facility Value p)
  const sumScores = responses.reduce((acc, r) => acc + r.itemScore, 0);
  const averageScore = Math.round((sumScores / n) * 100) / 100;
  const rawDifficulty = averageScore / maxItemMarks;
  const difficultyIndex = Math.round(Math.max(0, Math.min(1, rawDifficulty)) * 100) / 100;

  // 2. Item Discrimination Index (D) using upper/lower 27% groups
  // Sort responses by total examination score descending
  const sorted = [...responses].sort((a, b) => b.totalScore - a.totalScore);
  const groupSize = Math.max(1, Math.floor(n * 0.27));

  const upperGroup = sorted.slice(0, groupSize);
  const lowerGroup = sorted.slice(n - groupSize);

  const upperSum = upperGroup.reduce((acc, r) => acc + r.itemScore, 0);
  const lowerSum = lowerGroup.reduce((acc, r) => acc + r.itemScore, 0);

  const upperAvgRatio = upperSum / (groupSize * maxItemMarks);
  const lowerAvgRatio = lowerSum / (groupSize * maxItemMarks);

  const rawDiscrimination = upperAvgRatio - lowerAvgRatio;
  const discriminationIndex = Math.round(Math.max(-1, Math.min(1, rawDiscrimination)) * 100) / 100;

  // 3. Point-Biserial Correlation (r_pbis)
  let pointBiserial: number | null = null;
  if (n >= 10) {
    const meanTotal = responses.reduce((acc, r) => acc + r.totalScore, 0) / n;
    const meanItem = sumScores / n;

    let numerator = 0;
    let varItem = 0;
    let varTotal = 0;

    for (const r of responses) {
      const diffItem = r.itemScore - meanItem;
      const diffTotal = r.totalScore - meanTotal;
      numerator += diffItem * diffTotal;
      varItem += diffItem * diffItem;
      varTotal += diffTotal * diffTotal;
    }

    const denominator = Math.sqrt(varItem * varTotal);
    if (denominator > 0) {
      pointBiserial = Math.round((numerator / denominator) * 100) / 100;
    }
  }

  // Qualitative Labels
  let difficultyLabel: PsychometricCalculationResult['difficultyLabel'] = 'BALANCED';
  if (difficultyIndex < 0.30) difficultyLabel = 'VERY_DIFFICULT';
  else if (difficultyIndex > 0.80) difficultyLabel = 'VERY_EASY';
  else if (difficultyIndex >= 0.40 && difficultyIndex <= 0.70) difficultyLabel = 'BALANCED';
  else difficultyLabel = 'MODERATE';

  let discriminationLabel: PsychometricCalculationResult['discriminationLabel'] = 'GOOD';
  if (discriminationIndex >= 0.40) discriminationLabel = 'EXCELLENT';
  else if (discriminationIndex >= 0.30) discriminationLabel = 'GOOD';
  else if (discriminationIndex >= 0.20) discriminationLabel = 'MARGINAL';
  else discriminationLabel = 'POOR_OR_NEGATIVE';

  return {
    sampleSize: n,
    averageScore,
    difficultyIndex,
    discriminationIndex,
    pointBiserial,
    difficultyLabel,
    discriminationLabel,
  };
}
