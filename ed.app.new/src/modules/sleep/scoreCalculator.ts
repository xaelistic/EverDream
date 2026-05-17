/**
 * Sleep Score Calculator
 * Computes comprehensive sleep quality score from session data
 * Incorporates stage composition, continuity, duration, and efficiency
 */

import { SleepSession, SleepData, SleepScore } from './types';
import { sleepStageDetector } from './stageDetection';

export interface SleepScoringConfig {
  /** Target sleep duration (hours) */
  targetDuration: number;
  /** Deep sleep target % of total sleep */
  deepSleepTarget: number;
  /** REM sleep target % of total sleep */
  remTarget: number;
  /** Target sleep efficiency % */
  targetEfficiency: number;
  /** WASO penalty per minute of wake after sleep onset */
  wasoWeightPerMinute: number;
}

class SleepScoreCalculator {
  private config: SleepScoringConfig = {
    targetDuration: 8, // 8 hours
    deepSleepTarget: 15, // 15% of sleep
    remTarget: 20, // 20% of sleep
    targetEfficiency: 85, // 85%
    wasoWeightPerMinute: 0.5, // 0.5 points per minute of WASO
  };

  constructor(customConfig?: Partial<SleepScoringConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  /**
   * Calculate comprehensive sleep score from a completed session
   */
  calculateScore(session: SleepSession): SleepScore {
    if (!session.sleepData) {
      throw new Error('Cannot score incomplete session');
    }

    const sleepData = session.sleepData;

    // Component scores (each 0-100)
    const stageQuality = this.scoreStageQuality(sleepData);
    const continuity = this.scoreContinuity(sleepData);
    const duration = this.scoreDuration(sleepData);
    const efficiency = this.scoreEfficiency(sleepData);

    // Weighted average (adjust weights as needed)
    const weights = {
      stageQuality: 0.35, // Most important: deep + REM
      continuity: 0.25, // Important: uninterrupted sleep
      duration: 0.25, // Important: adequate time
      efficiency: 0.15, // Useful: time in bed vs asleep
    };

    const totalScore =
      stageQuality * weights.stageQuality +
      continuity * weights.continuity +
      duration * weights.duration +
      efficiency * weights.efficiency;

    const score: SleepScore = {
      score: Math.round(totalScore),
      breakdown: {
        stageQuality,
        continuity,
        duration,
        efficiency,
      },
      recommendation: this.generateRecommendation(
        { stageQuality, continuity, duration, efficiency },
        sleepData
      ),
      isAlignedWithCircadian: true, // Placeholder - set based on circadian data
    };

    return score;
  }

  /**
   * Score based on stage composition
   * REM + Deep weighted highest
   */
  private scoreStageQuality(sleepData: SleepData): number {
    const breakdown = sleepData.stageBreakdown;
    const totalSleep = sleepData.totalDuration;

    if (totalSleep === 0) return 0;

    const deepPercent = (breakdown.deep / totalSleep) * 100;
    const remPercent = (breakdown.rem / totalSleep) * 100;
    const lightPercent = (breakdown.light / totalSleep) * 100;

    // Scoring logic:
    // - Deep sleep: reward up to 15%, small penalty if over
    // - REM: reward up to 25%, moderate penalty if under
    // - Light sleep: neutral (filler)
    // - Awake: penalize

    let score = 50; // baseline

    // Deep sleep scoring
    if (deepPercent >= this.config.deepSleepTarget) {
      score += Math.min(deepPercent - this.config.deepSleepTarget, 5);
    } else {
      score -= (this.config.deepSleepTarget - deepPercent) * 1.5;
    }

    // REM scoring
    if (remPercent >= this.config.remTarget) {
      score += Math.min(remPercent - this.config.remTarget, 5);
    } else {
      score -= (this.config.remTarget - remPercent) * 1;
    }

    // Awake time penalty
    const awakePercent = (breakdown.awake / totalSleep) * 100;
    score -= awakePercent * 1.5;

    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Score based on sleep continuity (fewer awakenings = higher score)
   */
  private scoreContinuity(sleepData: SleepData): number {
    const { awakenings, waso } = sleepData;

    // Scoring logic:
    // - 0-2 awakenings: excellent (90+)
    // - 3-5: good (70-89)
    // - 6-10: fair (50-69)
    // - 10+: poor (< 50)

    let score = 100;

    // Penalty for WASO
    score -= sleepData.waso * this.config.wasoWeightPerMinute;

    // Additional penalty for frequency
    if (awakenings <= 2) {
      score = Math.max(score, 90);
    } else if (awakenings <= 5) {
      score = Math.min(score, 80);
    } else if (awakenings <= 10) {
      score = Math.min(score, 60);
    } else {
      score = Math.min(score, 40);
    }

    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Score based on total sleep duration vs target
   */
  private scoreDuration(sleepData: SleepData): number {
    const durationHours = sleepData.totalDuration / 60;
    const targetHours = this.config.targetDuration;

    // Optimal range: targetHours ± 1 hour
    const minOptimal = targetHours - 1;
    const maxOptimal = targetHours + 1;

    if (durationHours >= minOptimal && durationHours <= maxOptimal) {
      // Bonus for hitting target exactly
      return 100 - Math.abs(durationHours - targetHours) * 10;
    }

    // Penalty for too short
    if (durationHours < minOptimal) {
      const shortfall = minOptimal - durationHours;
      return Math.max(50, 100 - shortfall * 20);
    }

    // Penalty for too long
    const excess = durationHours - maxOptimal;
    return Math.max(50, 100 - excess * 15);
  }

  /**
   * Score based on sleep efficiency
   */
  private scoreEfficiency(sleepData: SleepData): number {
    const efficiency = sleepData.efficiency;
    const target = this.config.targetEfficiency;

    if (efficiency >= target) {
      return 100 - Math.max(0, efficiency - 100) * 2; // Slight penalty if > 100%
    }

    // Linear penalty below target
    return (efficiency / target) * 100;
  }

  /**
   * Generate personalized recommendation based on score components
   */
  private generateRecommendation(
    components: {
      stageQuality: number;
      continuity: number;
      duration: number;
      efficiency: number;
    },
    sleepData: SleepData
  ): string {
    // Find lowest scoring component
    const scores = Object.entries(components).sort((a, b) => a[1] - b[1]);
    const [lowestComponent, lowestScore] = scores[0];

    const breakdown = sleepData.stageBreakdown;
    const totalSleep = sleepData.totalDuration;
    const deepPercent = totalSleep > 0 ? (breakdown.deep / totalSleep) * 100 : 0;
    const remPercent = totalSleep > 0 ? (breakdown.rem / totalSleep) * 100 : 0;

    if (lowestComponent === 'stageQuality') {
      if (deepPercent < 10) {
        return '💤 Try to establish a consistent sleep schedule for deeper sleep phases.';
      }
      if (remPercent < 15) {
        return '🌙 Getting more uninterrupted sleep may increase your REM cycles.';
      }
      return '🧠 Quality sleep often improves with regular exercise and consistent bedtime.';
    }

    if (lowestComponent === 'continuity') {
      if (sleepData.awakenings > 5) {
        return '⏰ Consider reducing caffeine or adjusting room temperature for fewer awakenings.';
      }
      return '😴 Minimize disruptions—silence your phone and create a dark sleep environment.';
    }

    if (lowestComponent === 'duration') {
      if (sleepData.totalDuration < 360) {
        return '⏱️ Aim for 7-9 hours nightly. Consider moving bedtime earlier.';
      }
      return '😮 You may be sleeping more than optimal—quality matters more than duration.';
    }

    if (lowestComponent === 'efficiency') {
      return '🛏️ Spend less time awake in bed. Use bed only for sleep and intimacy.';
    }

    return '✨ Great sleep! Keep maintaining your healthy sleep routine.';
  }

  /**
   * Apply morning calibration feedback to algorithmic score
   * Simple approach: offset adjustment based on user's subjective rating
   */
  applyCalibration(
    algorithicScore: number,
    userRating: number, // 1-10
    currentCalibrationOffset: number = 0
  ): { newScore: number; newOffset: number } {
    // Convert user rating (1-10) to equivalent score (10-100)
    const userScore = userRating * 10;

    // Difference between what algorithm predicted and user felt
    const difference = userScore - algorithicScore;

    // Adjust offset gradually (avoid overcorrection)
    const adjustmentRate = 0.3; // Use 30% of difference
    const newOffset = currentCalibrationOffset + difference * adjustmentRate;

    // Clamp offset to reasonable range (-20 to +20)
    const clampedOffset = Math.max(-20, Math.min(20, newOffset));

    // Apply offset to score
    const newScore = Math.max(0, Math.min(100, algorithicScore + clampedOffset));

    return {
      newScore: Math.round(newScore),
      newOffset: clampedOffset,
    };
  }
}

export const sleepScoreCalculator = new SleepScoreCalculator();
