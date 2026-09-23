/**
 * OBE Attainment & VTU Marks Scaling Engine
 * Fully compliant with:
 * - VTU Autonomous Regulations (CBCS Scaling 50:50, 10-point Letter Grading)
 * - NBA Tier-1 SAR Criterion 3 (Course Outcomes & Program Outcomes Mapping)
 * - NBA Tier-1 SAR Criterion 4 (Direct Attainment Calculation & Gap Analysis)
 */

export interface StudentMarkEntry {
  usn: string;
  studentName: string;
  cieMarks: number;    // out of maxCieMarks (e.g. 50)
  seeRawMarks: number; // out of maxSeeMarks (e.g. 100)
}

export interface ScaledStudentResult extends StudentMarkEntry {
  seeScaledMarks: number; // scaled to scaledSeeWeight (e.g. 50)
  totalMarks: number;     // cieMarks + seeScaledMarks (out of 100)
  grade: string;          // 'O' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'P' | 'F'
  gradePoint: number;     // 10 | 9 | 8 | 7 | 6 | 5 | 4 | 0
  seePassed: boolean;     // e.g. seeRawMarks >= 35% of maxSeeMarks
  totalPassed: boolean;   // totalMarks >= 40% of maxTotalMarks
  isPassed: boolean;      // seePassed && totalPassed
  resultStatus: 'DISTINCTION' | 'FIRST CLASS' | 'SECOND CLASS' | 'PASS' | 'FAIL';
}

export interface CohortScalingStats {
  totalAppeared: number;
  totalPassed: number;
  totalFailed: number;
  passPercentage: number;
  avgCieMarks: number;
  avgSeeRawMarks: number;
  avgSeeScaledMarks: number;
  avgTotalMarks: number;
  highestTotalMarks: number;
  lowestTotalMarks: number;
  stdDeviation: number;
  gradeDistribution: Record<string, number>;
  gradeDistributionPercent: Record<string, number>;
}

export interface ScalingConfig {
  maxCieMarks?: number;       // default: 50
  maxSeeMarks?: number;       // default: 100
  scaledSeeWeight?: number;   // default: 50
  minSeePassPercent?: number; // default: 35% (VTU standard: min 35/100 or 18/50 in SEE)
  minTotalPassPercent?: number; // default: 40% (VTU standard: min 40/100 aggregate)
}

/**
 * Assigns VTU Autonomous 10-point letter grade based on total aggregate marks.
 */
export function calculateVtuGrade(totalMarks: number, isPassed: boolean): { grade: string; gradePoint: number; status: ScaledStudentResult['resultStatus'] } {
  if (!isPassed || totalMarks < 40) {
    return { grade: 'F', gradePoint: 0, status: 'FAIL' };
  }
  if (totalMarks >= 90) return { grade: 'O', gradePoint: 10, status: 'DISTINCTION' };
  if (totalMarks >= 80) return { grade: 'A+', gradePoint: 9, status: 'DISTINCTION' };
  if (totalMarks >= 70) return { grade: 'A', gradePoint: 8, status: 'FIRST CLASS' };
  if (totalMarks >= 60) return { grade: 'B+', gradePoint: 7, status: 'FIRST CLASS' };
  if (totalMarks >= 55) return { grade: 'B', gradePoint: 6, status: 'SECOND CLASS' };
  if (totalMarks >= 50) return { grade: 'C', gradePoint: 5, status: 'SECOND CLASS' };
  return { grade: 'P', gradePoint: 4, status: 'PASS' };
}

/**
 * Computes VTU marks scaling and batch statistics for a student cohort.
 */
export function scaleVtuMarks(
  students: StudentMarkEntry[],
  config: ScalingConfig = {}
): { results: ScaledStudentResult[]; stats: CohortScalingStats } {
  const maxCie = config.maxCieMarks ?? 50;
  const maxSee = config.maxSeeMarks ?? 100;
  const scaledWeight = config.scaledSeeWeight ?? 50;
  const minSeePct = config.minSeePassPercent ?? 35;
  const minTotalPct = config.minTotalPassPercent ?? 40;

  const results: ScaledStudentResult[] = students.map((s) => {
    // Round to 2 decimal places
    const seeScaledMarks = Math.round(((s.seeRawMarks / maxSee) * scaledWeight) * 100) / 100;
    const totalMarks = Math.round((s.cieMarks + seeScaledMarks) * 100) / 100;

    const seePassed = (s.seeRawMarks / maxSee) * 100 >= minSeePct;
    const totalPassed = totalMarks >= (minTotalPct / 100) * (maxCie + scaledWeight);
    const isPassed = seePassed && totalPassed;

    const { grade, gradePoint, status } = calculateVtuGrade(totalMarks, isPassed);

    return {
      ...s,
      seeScaledMarks,
      totalMarks,
      grade,
      gradePoint,
      seePassed,
      totalPassed,
      isPassed,
      resultStatus: status,
    };
  });

  const totalAppeared = results.length;
  if (totalAppeared === 0) {
    return {
      results: [],
      stats: {
        totalAppeared: 0,
        totalPassed: 0,
        totalFailed: 0,
        passPercentage: 0,
        avgCieMarks: 0,
        avgSeeRawMarks: 0,
        avgSeeScaledMarks: 0,
        avgTotalMarks: 0,
        highestTotalMarks: 0,
        lowestTotalMarks: 0,
        stdDeviation: 0,
        gradeDistribution: {},
        gradeDistributionPercent: {},
      },
    };
  }

  const passedCount = results.filter((r) => r.isPassed).length;
  const failedCount = totalAppeared - passedCount;
  const passPercentage = Math.round((passedCount / totalAppeared) * 10000) / 100;

  const sumCie = results.reduce((acc, r) => acc + r.cieMarks, 0);
  const sumRawSee = results.reduce((acc, r) => acc + r.seeRawMarks, 0);
  const sumScaledSee = results.reduce((acc, r) => acc + r.seeScaledMarks, 0);
  const sumTotal = results.reduce((acc, r) => acc + r.totalMarks, 0);

  const avgCieMarks = Math.round((sumCie / totalAppeared) * 100) / 100;
  const avgSeeRawMarks = Math.round((sumRawSee / totalAppeared) * 100) / 100;
  const avgSeeScaledMarks = Math.round((sumScaledSee / totalAppeared) * 100) / 100;
  const avgTotalMarks = Math.round((sumTotal / totalAppeared) * 100) / 100;

  const highestTotalMarks = Math.max(...results.map((r) => r.totalMarks));
  const lowestTotalMarks = Math.min(...results.map((r) => r.totalMarks));

  // Sample Standard deviation of Total Marks
  const variance =
    results.reduce((acc, r) => acc + Math.pow(r.totalMarks - avgTotalMarks, 2), 0) /
    (totalAppeared > 1 ? totalAppeared - 1 : 1);
  const stdDeviation = Math.round(Math.sqrt(variance) * 100) / 100;

  const gradeDistribution: Record<string, number> = {
    O: 0,
    'A+': 0,
    A: 0,
    'B+': 0,
    B: 0,
    C: 0,
    P: 0,
    F: 0,
  };

  for (const r of results) {
    if (gradeDistribution[r.grade] !== undefined) {
      gradeDistribution[r.grade]++;
    } else {
      gradeDistribution[r.grade] = 1;
    }
  }

  const gradeDistributionPercent: Record<string, number> = {};
  for (const [grade, count] of Object.entries(gradeDistribution)) {
    gradeDistributionPercent[grade] = Math.round((count / totalAppeared) * 10000) / 100;
  }

  return {
    results,
    stats: {
      totalAppeared,
      totalPassed: passedCount,
      totalFailed: failedCount,
      passPercentage,
      avgCieMarks,
      avgSeeRawMarks,
      avgSeeScaledMarks,
      avgTotalMarks,
      highestTotalMarks,
      lowestTotalMarks,
      stdDeviation,
      gradeDistribution,
      gradeDistributionPercent,
    },
  };
}

// ─── NBA Criterion 3 & 4 Attainment Types & Engine ───────

export interface CoDefinition {
  coCode: string;
  description: string;
  bloomsLevel?: string;
}

export interface StudentCoScore {
  usn: string;
  cieMarks: Record<string, number>; // coCode -> marks scored
  seeMarks: Record<string, number>; // coCode -> marks scored
}

export interface CoMaxMarks {
  cieMax: Record<string, number>; // coCode -> max marks
  seeMax: Record<string, number>; // coCode -> max marks
}

export interface CoAttainmentResult {
  coCode: string;
  description: string;
  targetPercent: number; // e.g. 60%
  cieStudentsMeetingTarget: number;
  cieTotalStudents: number;
  ciePercentageMeetingTarget: number;
  cieAttainmentLevel: number; // 0, 1, 2, or 3
  seeStudentsMeetingTarget: number;
  seeTotalStudents: number;
  seePercentageMeetingTarget: number;
  seeAttainmentLevel: number; // 0, 1, 2, or 3
  overallDirectAttainment: number; // e.g. 0.5 * CIE + 0.5 * SEE
  attainmentStatus: 'ATTAINED' | 'PARTIALLY ATTAINED' | 'NOT ATTAINED';
}

export interface PoAttainmentResult {
  poCode: string; // PO1..PO12, PSO1, PSO2
  mappedCosCount: number;
  averageCorrelation: number; // e.g. 2.6
  calculatedAttainment: number; // out of 3.00
  targetAttainment: number; // e.g. 2.40
  gap: number; // target - calculated
  status: 'MET' | 'GAP_IDENTIFIED';
}

/**
 * Standard NBA 3-Level Rubric:
 * Level 3: >= 70% of students score >= targetScorePercent
 * Level 2: 60% to 69.99% of students score >= targetScorePercent
 * Level 1: 50% to 59.99% of students score >= targetScorePercent
 * Level 0: < 50% of students score >= targetScorePercent
 */
export function getAttainmentLevel(percentageMeetingTarget: number): number {
  if (percentageMeetingTarget >= 70) return 3;
  if (percentageMeetingTarget >= 60) return 2;
  if (percentageMeetingTarget >= 50) return 1;
  return 0;
}

/**
 * Calculates direct Course Outcome (CO) attainment across CIE and SEE.
 */
export function calculateDirectCoAttainment(
  cos: CoDefinition[],
  maxMarks: CoMaxMarks,
  studentScores: StudentCoScore[],
  options: {
    targetPercent?: number; // default: 60%
    cieWeight?: number;    // default: 0.50
    seeWeight?: number;    // default: 0.50
  } = {}
): CoAttainmentResult[] {
  const targetPct = options.targetPercent ?? 60;
  const cieWeight = options.cieWeight ?? 0.5;
  const seeWeight = options.seeWeight ?? 0.5;
  const totalStudents = studentScores.length;

  if (totalStudents === 0) return [];

  return cos.map((co) => {
    const coCode = co.coCode;
    const cieMax = maxMarks.cieMax[coCode] || 1;
    const seeMax = maxMarks.seeMax[coCode] || 1;

    // Count students scoring >= target percentage of max marks
    let cieMeeting = 0;
    let seeMeeting = 0;

    for (const student of studentScores) {
      const studentCie = student.cieMarks[coCode] ?? 0;
      const studentSee = student.seeMarks[coCode] ?? 0;

      if ((studentCie / cieMax) * 100 >= targetPct) cieMeeting++;
      if ((studentSee / seeMax) * 100 >= targetPct) seeMeeting++;
    }

    const ciePct = Math.round((cieMeeting / totalStudents) * 10000) / 100;
    const seePct = Math.round((seeMeeting / totalStudents) * 10000) / 100;

    const cieLevel = getAttainmentLevel(ciePct);
    const seeLevel = getAttainmentLevel(seePct);

    const directAttainment = Math.round((cieWeight * cieLevel + seeWeight * seeLevel) * 100) / 100;

    let status: CoAttainmentResult['attainmentStatus'] = 'NOT ATTAINED';
    if (directAttainment >= 2.5) status = 'ATTAINED';
    else if (directAttainment >= 1.5) status = 'PARTIALLY ATTAINED';

    return {
      coCode,
      description: co.description,
      targetPercent: targetPct,
      cieStudentsMeetingTarget: cieMeeting,
      cieTotalStudents: totalStudents,
      ciePercentageMeetingTarget: ciePct,
      cieAttainmentLevel: cieLevel,
      seeStudentsMeetingTarget: seeMeeting,
      seeTotalStudents: totalStudents,
      seePercentageMeetingTarget: seePct,
      seeAttainmentLevel: seeLevel,
      overallDirectAttainment: directAttainment,
      attainmentStatus: status,
    };
  });
}

/**
 * Calculates Program Outcome (PO1..PO12) and PSO (PSO1..PSO2) Attainment
 * using NBA Weighted Articulation Matrix:
 * PO_j = Sum(CO_i * Weight_ij) / Sum(Weight_ij)
 */
export function calculatePoAttainment(
  coAttainments: CoAttainmentResult[],
  coPoMatrix: Record<string, Record<string, number>>, // e.g. { "CO1": { "PO1": 3, "PO2": 2 } }
  targetThreshold = 2.4
): PoAttainmentResult[] {
  const allPos = [
    'PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6',
    'PO7', 'PO8', 'PO9', 'PO10', 'PO11', 'PO12',
    'PSO1', 'PSO2'
  ];

  const coAttainmentMap = new Map<string, number>();
  for (const ca of coAttainments) {
    coAttainmentMap.set(ca.coCode, ca.overallDirectAttainment);
  }

  return allPos.map((poCode) => {
    let weightedSum = 0;
    let weightTotal = 0;
    let mappedCount = 0;

    for (const [coCode, poRatings] of Object.entries(coPoMatrix)) {
      const rating = poRatings[poCode];
      if (rating && rating > 0) {
        const coAttainment = coAttainmentMap.get(coCode) ?? 0;
        weightedSum += coAttainment * rating;
        weightTotal += rating;
        mappedCount++;
      }
    }

    if (mappedCount === 0 || weightTotal === 0) {
      return {
        poCode,
        mappedCosCount: 0,
        averageCorrelation: 0,
        calculatedAttainment: 0,
        targetAttainment: targetThreshold,
        gap: 0,
        status: 'MET',
      };
    }

    const avgCorrelation = Math.round((weightTotal / mappedCount) * 100) / 100;
    const calculatedAttainment = Math.round((weightedSum / weightTotal) * 100) / 100;
    const gap = Math.round((targetThreshold - calculatedAttainment) * 100) / 100;

    return {
      poCode,
      mappedCosCount: mappedCount,
      averageCorrelation: avgCorrelation,
      calculatedAttainment,
      targetAttainment: targetThreshold,
      gap,
      status: gap <= 0 ? 'MET' : 'GAP_IDENTIFIED',
    };
  });
}
