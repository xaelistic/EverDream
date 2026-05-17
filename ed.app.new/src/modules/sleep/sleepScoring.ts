export type SleepScoreBreakdown = {
  duration: number;
  stageQuality: number;
  continuity: number;
  circadianAlignment: number;
  disturbance: number;
};

export type SleepStageMinutes = {
  awake: number;
  light: number;
  deep: number;
  rem: number;
};

export type SleepScoreInput = {
  totalSleepMinutes: number;
  targetSleepMinutes: number;
  timeInBedMinutes: number;
  stageMinutes: SleepStageMinutes;
  awakenings: number;
  wasoMinutes: number;
  circadianAlignmentScore: number;
  movementIndex: number;
  snoreIndex: number;
  sleepTalkIndex: number;
};

export type SleepScoreResult = {
  score: number;
  breakdown: SleepScoreBreakdown;
};

const WEIGHTS = {
  duration: 0.25,
  stageQuality: 0.3,
  continuity: 0.2,
  circadianAlignment: 0.2,
  disturbance: 0.05,
};

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateSleepScore(input: SleepScoreInput): SleepScoreResult {
  const breakdown: SleepScoreBreakdown = {
    duration: scoreDuration(input.totalSleepMinutes, input.targetSleepMinutes),
    stageQuality: scoreStageQuality(input.stageMinutes, input.totalSleepMinutes),
    continuity: scoreContinuity(input.awakenings, input.wasoMinutes),
    circadianAlignment: clampScore(input.circadianAlignmentScore),
    disturbance: scoreDisturbance(input.movementIndex, input.snoreIndex, input.sleepTalkIndex),
  };

  const score =
    breakdown.duration * WEIGHTS.duration +
    breakdown.stageQuality * WEIGHTS.stageQuality +
    breakdown.continuity * WEIGHTS.continuity +
    breakdown.circadianAlignment * WEIGHTS.circadianAlignment +
    breakdown.disturbance * WEIGHTS.disturbance;

  return {
    score: clampScore(score),
    breakdown,
  };
}

export function calibrateSleepScore(
  algorithmicScore: number,
  sleepRating?: number,
  previousOffset = 0
): { calibratedScore: number; calibrationOffset: number } {
  if (!Number.isFinite(sleepRating)) {
    const boundedOffset = Math.max(-15, Math.min(15, previousOffset));
    return {
      calibratedScore: clampScore(algorithmicScore + boundedOffset),
      calibrationOffset: boundedOffset,
    };
  }

  const subjectiveScore = clampScore((sleepRating || 0) * 10);
  const difference = subjectiveScore - clampScore(algorithmicScore);
  const nextOffset = Math.max(-15, Math.min(15, previousOffset + difference * 0.2));

  return {
    calibratedScore: clampScore(algorithmicScore + nextOffset),
    calibrationOffset: nextOffset,
  };
}

export function getSleepQualityLabel(score: number): 'Poor' | 'Fragile' | 'Steady' | 'Strong' {
  if (score >= 82) return 'Strong';
  if (score >= 68) return 'Steady';
  if (score >= 50) return 'Fragile';
  return 'Poor';
}

export function getSleepQualitySymbol(score: number): string {
  if (score >= 82) return '++';
  if (score >= 68) return '+';
  if (score >= 50) return '~';
  return '!';
}

function scoreDuration(totalSleepMinutes: number, targetSleepMinutes: number): number {
  const target = Math.max(240, targetSleepMinutes || 480);
  const actual = Math.max(0, totalSleepMinutes || 0);
  const difference = Math.abs(actual - target);
  const tolerance = 45;

  if (difference <= tolerance) {
    return clampScore(100 - (difference / tolerance) * 8);
  }

  const penalty = actual < target ? (difference - tolerance) / 4 : (difference - tolerance) / 6;
  return clampScore(92 - penalty);
}

function scoreStageQuality(stageMinutes: SleepStageMinutes, totalSleepMinutes: number): number {
  const total = Math.max(1, totalSleepMinutes || 0);
  const deepPercent = safePercent(stageMinutes.deep, total);
  const remPercent = safePercent(stageMinutes.rem, total);
  const awakePercent = safePercent(stageMinutes.awake, total + Math.max(0, stageMinutes.awake || 0));

  const deepScore = scoreAgainstRange(deepPercent, 13, 23);
  const remScore = scoreAgainstRange(remPercent, 18, 27);
  const awakePenalty = Math.min(25, awakePercent * 1.8);

  return clampScore(deepScore * 0.45 + remScore * 0.45 + 80 * 0.1 - awakePenalty);
}

function scoreContinuity(awakenings: number, wasoMinutes: number): number {
  const awakeningPenalty = Math.max(0, awakenings || 0) * 4.5;
  const wasoPenalty = Math.max(0, wasoMinutes || 0) * 0.55;
  return clampScore(100 - awakeningPenalty - wasoPenalty);
}

function scoreDisturbance(movementIndex: number, snoreIndex: number, sleepTalkIndex: number): number {
  const movementPenalty = clampScore(movementIndex) * 0.45;
  const snorePenalty = clampScore(snoreIndex) * 0.3;
  const talkPenalty = clampScore(sleepTalkIndex) * 0.25;
  return clampScore(100 - movementPenalty - snorePenalty - talkPenalty);
}

function scoreAgainstRange(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 100;
  if (value < min) return clampScore(100 - (min - value) * 4);
  return clampScore(100 - (value - max) * 2.5);
}

function safePercent(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return (Math.max(0, value) / total) * 100;
}
