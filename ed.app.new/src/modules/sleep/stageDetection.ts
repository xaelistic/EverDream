/**
 * Sleep Stage Detection Engine
 * Rules-based approach using motion + audio features
 * Estimates: Awake, Light Sleep, Deep Sleep, REM
 *
 * Algorithm overview:
 * - High motion + energy → Awake
 * - Moderate motion, variable patterns → Light Sleep
 * - Very low motion, stable patterns → Deep Sleep
 * - Low motion + audio/breathing patterns + fast micro-movements → REM
 */

import { SleepSession, SleepData, SleepStage, MotionEvent, AudioFeaturePoint } from './types';

export interface StageDetectionConfig {
  /** Minimum duration (seconds) to classify a period as a sleep stage */
  minStageDuration: number;
  /** Motion threshold for awake detection */
  awakeThreshold: number;
  /** Motion threshold for light/deep boundary */
  deepSleepThreshold: number;
  /** Audio energy threshold for REM detection */
  remAudioThreshold: number;
}

class SleepStageDetector {
  private config: StageDetectionConfig = {
    minStageDuration: 60, // 1 minute minimum
    awakeThreshold: 0.3, // Motion magnitude
    deepSleepThreshold: 0.08, // Very still
    remAudioThreshold: 0.4, // Breathing/speech detection
  };

  constructor(customConfig?: Partial<StageDetectionConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  /**
   * Detect sleep stages from a completed session
   */
  detectStages(session: SleepSession): {
    stageBreakdown: Record<SleepStage, number>;
    detailedTimeline: Array<{ stage: SleepStage; start: number; duration: number }>;
  } {
    if (session.motionEvents.length === 0) {
      return {
        stageBreakdown: { awake: 0, light: 0, deep: 0, rem: 0 },
        detailedTimeline: [],
      };
    }

    // Combine motion and audio data with timestamps
    const timeline = this.createTimeline(session);

    // Classify each time window
    const classified = this.classifyWindows(timeline);

    // Merge adjacent same stages and compute duration
    const merged = this.mergeStages(classified);

    // Convert to minutes
    const stageBreakdown = this.computeStageBreakdown(merged, session);

    return {
      stageBreakdown,
      detailedTimeline: merged,
    };
  }

  /**
   * Detect brief awakenings (WASO - Wake After Sleep Onset)
   */
  detectAwakenings(
    session: SleepSession,
    minDuration: number = 30 // 30 seconds
  ): Array<{ start: number; duration: number }> {
    const awakenings: Array<{ start: number; duration: number }> = [];
    const awakeSpans = this.findContinuousAwake(session, minDuration);

    for (const span of awakeSpans) {
      awakenings.push({
        start: span.start,
        duration: span.duration,
      });
    }

    return awakenings;
  }

  /**
   * Estimate REM vs non-REM sleep
   * REM indicators: low motion + breathing patterns + micro-movements
   */
  estimateREMPercentage(session: SleepSession): number {
    if (session.sleepData?.stageBreakdown.rem !== undefined) {
      return (session.sleepData.stageBreakdown.rem / session.sleepData.totalDuration) * 100;
    }

    const remTime = session.sleepData?.stageBreakdown.rem || 0;
    const totalSleep =
      Object.values(session.sleepData?.stageBreakdown || {}).reduce((a, b) => a + b, 0) || 1;

    return (remTime / totalSleep) * 100;
  }

  private createTimeline(
    session: SleepSession
  ): Array<{
    timestamp: number;
    motionMagnitude: number;
    audioEnergy: number;
    audioSpectral: number;
  }> {
    // Merge motion and audio by timestamp
    const map = new Map<
      number,
      { motionMagnitude: number; audioEnergy: number; audioSpectral: number }
    >();

    // Add motion data
    for (const event of session.motionEvents) {
      const ts = Math.round(event.timestamp / 1000) * 1000; // Round to 1s buckets
      if (!map.has(ts)) {
        map.set(ts, { motionMagnitude: event.acceleration, audioEnergy: 0, audioSpectral: 0 });
      } else {
        const existing = map.get(ts)!;
        existing.motionMagnitude = Math.max(existing.motionMagnitude, event.acceleration);
      }
    }

    // Add audio data
    for (const feature of session.audioFeatures) {
      const ts = Math.round(feature.timestamp / 1000) * 1000;
      if (!map.has(ts)) {
        map.set(ts, { motionMagnitude: 0, audioEnergy: feature.energy, audioSpectral: feature.spectralFeature });
      } else {
        const existing = map.get(ts)!;
        existing.audioEnergy = Math.max(existing.audioEnergy, feature.energy);
        existing.audioSpectral = Math.max(existing.audioSpectral, feature.spectralFeature);
      }
    }

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([timestamp, data]) => ({ timestamp, ...data }));
  }

  private classifyWindows(
    timeline: Array<{
      timestamp: number;
      motionMagnitude: number;
      audioEnergy: number;
      audioSpectral: number;
    }>
  ): Array<{ timestamp: number; stage: SleepStage }> {
    // Use sliding window to smooth classifications
    const windowSize = 5; // 5-second window
    const classified: Array<{ timestamp: number; stage: SleepStage }> = [];

    for (let i = 0; i < timeline.length; i++) {
      const windowStart = Math.max(0, i - windowSize);
      const windowEnd = Math.min(timeline.length, i + windowSize + 1);
      const window = timeline.slice(windowStart, windowEnd);

      const avgMotion = window.reduce((sum, p) => sum + p.motionMagnitude, 0) / window.length;
      const avgAudioEnergy = window.reduce((sum, p) => sum + p.audioEnergy, 0) / window.length;
      const avgAudioSpectral = window.reduce((sum, p) => sum + p.audioSpectral, 0) / window.length;

      const stage = this.classifySinglePoint(avgMotion, avgAudioEnergy, avgAudioSpectral);
      classified.push({
        timestamp: timeline[i].timestamp,
        stage,
      });
    }

    return classified;
  }

  private classifySinglePoint(
    motionMagnitude: number,
    audioEnergy: number,
    audioSpectral: number
  ): SleepStage {
    // Heuristic rules (tunable)

    // Rule 1: High motion = Awake
    if (motionMagnitude > this.config.awakeThreshold) {
      return 'awake';
    }

    // Rule 2: Very low motion + stable = Deep Sleep
    if (motionMagnitude < this.config.deepSleepThreshold && audioEnergy < 0.2) {
      return 'deep';
    }

    // Rule 3: Low motion + breathing/audio patterns = REM
    if (
      motionMagnitude < this.config.awakeThreshold * 0.7 &&
      audioEnergy > this.config.remAudioThreshold * 0.5 &&
      audioSpectral > 0.3
    ) {
      return 'rem';
    }

    // Rule 4: Moderate motion + variable = Light Sleep
    return 'light';
  }

  private mergeStages(
    classified: Array<{ timestamp: number; stage: SleepStage }>
  ): Array<{ stage: SleepStage; start: number; duration: number }> {
    if (classified.length === 0) return [];

    const merged: Array<{ stage: SleepStage; start: number; duration: number }> = [];
    let currentStage = classified[0].stage;
    let stageStart = classified[0].timestamp;

    for (let i = 1; i < classified.length; i++) {
      if (classified[i].stage !== currentStage) {
        // Stage change
        const duration = classified[i].timestamp - stageStart;
        if (duration >= this.config.minStageDuration * 1000) {
          merged.push({
            stage: currentStage,
            start: stageStart,
            duration,
          });
        }
        currentStage = classified[i].stage;
        stageStart = classified[i].timestamp;
      }
    }

    // Don't forget last stage
    const duration = classified[classified.length - 1].timestamp - stageStart;
    if (duration >= this.config.minStageDuration * 1000) {
      merged.push({
        stage: currentStage,
        start: stageStart,
        duration,
      });
    }

    return merged;
  }

  private computeStageBreakdown(
    merged: Array<{ stage: SleepStage; start: number; duration: number }>,
    session: SleepSession
  ): Record<SleepStage, number> {
    const breakdown: Record<SleepStage, number> = {
      awake: 0,
      light: 0,
      deep: 0,
      rem: 0,
    };

    for (const segment of merged) {
      const minutes = segment.duration / 1000 / 60;
      breakdown[segment.stage] += minutes;
    }

    return breakdown;
  }

  private findContinuousAwake(
    session: SleepSession,
    minDuration: number
  ): Array<{ start: number; duration: number }> {
    const awakeSpans: Array<{ start: number; duration: number }> = [];

    if (session.motionEvents.length === 0) return awakeSpans;

    let awakeStart: number | null = null;

    for (const event of session.motionEvents) {
      if (event.acceleration > this.config.awakeThreshold) {
        if (!awakeStart) {
          awakeStart = event.timestamp;
        }
      } else {
        if (awakeStart) {
          const duration = event.timestamp - awakeStart;
          if (duration >= minDuration * 1000) {
            awakeSpans.push({ start: awakeStart, duration });
          }
          awakeStart = null;
        }
      }
    }

    return awakeSpans;
  }
}

export const sleepStageDetector = new SleepStageDetector();
