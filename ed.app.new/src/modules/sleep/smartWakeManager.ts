/**
 * Smart Wake Window Manager
 * Uses Layer 1 wearable data to determine optimal wake times within user-defined windows
 */

import { SleepData, CircadianMetrics, SleepStage } from './types';

export interface WakeWindow {
  /** User-defined wake window start (HH:MM) */
  startTime: string;
  /** User-defined wake window end (HH:MM) */
  endTime: string;
  /** Optimal wake time within window based on sleep data */
  optimalWakeTime?: Date;
  /** Confidence in optimal time (0-1) */
  confidence: number;
  /** Reason for optimal time selection */
  reason: string;
}

export interface WakeTrigger {
  /** When to trigger wake notification */
  timestamp: number;
  /** Wake window this trigger belongs to */
  window: WakeWindow;
  /** Associated sleep session data */
  sleepData: SleepData;
  /** Current sleep stage at trigger time */
  currentStage: SleepStage;
}

export class SmartWakeManager {
  private static readonly LIGHT_SLEEP_PREFERENCE = 0.7;
  private static readonly WAKE_BUFFER_MINUTES = 10;

  /**
   * Calculate optimal wake time within user's preferred window
   * Prioritizes light sleep phases for gentle awakening
   */
  static calculateOptimalWakeTime(
    sleepData: SleepData,
    circadianMetrics: CircadianMetrics,
    wakeWindow: { start: string; end: string }
  ): WakeWindow {
    const windowStart = this.parseTimeString(wakeWindow.start);
    const windowEnd = this.parseTimeString(wakeWindow.end);

    // Find light sleep periods within wake window
    const lightSleepPeriods = this.findLightSleepPeriods(sleepData, windowStart, windowEnd);

    if (lightSleepPeriods.length > 0) {
      // Choose the latest light sleep period for maximum sleep benefit
      const optimalPeriod = lightSleepPeriods[lightSleepPeriods.length - 1];
      const optimalTime = new Date(sleepData.timestamp + optimalPeriod.start * 60 * 1000);

      return {
        startTime: wakeWindow.start,
        endTime: wakeWindow.end,
        optimalWakeTime: optimalTime,
        confidence: this.LIGHT_SLEEP_PREFERENCE,
        reason: `Light sleep phase detected at ${optimalTime.toLocaleTimeString()}`
      };
    }

    // Fallback: circadian-aligned time
    const circadianTime = this.calculateCircadianWakeTime(circadianMetrics, windowStart, windowEnd);

    return {
      startTime: wakeWindow.start,
      endTime: wakeWindow.end,
      optimalWakeTime: circadianTime,
      confidence: 0.5,
      reason: `Circadian-aligned wake time at ${circadianTime.toLocaleTimeString()}`
    };
  }

  /**
   * Find periods of light sleep within a time window
   */
  private static findLightSleepPeriods(
    sleepData: SleepData,
    windowStart: Date,
    windowEnd: Date
  ): Array<{ start: number; end: number }> {
    // This would analyze the sleep stages over time
    // For now, simulate based on typical sleep patterns
    const sleepStart = new Date(sleepData.timestamp);
    const periods: Array<{ start: number; end: number }> = [];

    // Simulate finding light sleep periods (would use actual stage data)
    const totalSleepTime = sleepData.totalDuration;
    const lightSleepTime = sleepData.stageBreakdown.light;

    if (lightSleepTime > 0) {
      // Assume light sleep occurs in the latter half of sleep
      const lightSleepStart = totalSleepTime * 0.6;
      const lightSleepEnd = totalSleepTime * 0.9;

      // Check if this overlaps with wake window
      const sleepStartMinutes = (sleepStart.getHours() * 60) + sleepStart.getMinutes();
      const windowStartMinutes = (windowStart.getHours() * 60) + windowStart.getMinutes();
      const windowEndMinutes = (windowEnd.getHours() * 60) + windowEnd.getMinutes();

      const lightSleepStartMinutes = sleepStartMinutes + lightSleepStart;
      const lightSleepEndMinutes = sleepStartMinutes + lightSleepEnd;

      if (lightSleepStartMinutes <= windowEndMinutes && lightSleepEndMinutes >= windowStartMinutes) {
        periods.push({
          start: Math.max(lightSleepStart, windowStartMinutes - sleepStartMinutes),
          end: Math.min(lightSleepEnd, windowEndMinutes - sleepStartMinutes)
        });
      }
    }

    return periods;
  }

  /**
   * Calculate circadian-aligned wake time within window
   */
  private static calculateCircadianWakeTime(
    circadianMetrics: CircadianMetrics,
    windowStart: Date,
    windowEnd: Date
  ): Date {
    const naturalWakeMinutes = circadianMetrics.naturalWakeTime;
    const naturalWakeTime = new Date();
    naturalWakeTime.setHours(Math.floor(naturalWakeMinutes / 60));
    naturalWakeTime.setMinutes(naturalWakeMinutes % 60);

    // Clamp to wake window
    if (naturalWakeTime < windowStart) return windowStart;
    if (naturalWakeTime > windowEnd) return windowEnd;

    return naturalWakeTime;
  }

  /**
   * Determine if current time is optimal for wake trigger
   */
  static shouldTriggerWake(
    currentTime: Date,
    wakeWindow: WakeWindow,
    sleepData: SleepData
  ): boolean {
    if (!wakeWindow.optimalWakeTime) return false;

    const timeDiff = Math.abs(currentTime.getTime() - wakeWindow.optimalWakeTime.getTime());
    const bufferMs = this.WAKE_BUFFER_MINUTES * 60 * 1000;

    return timeDiff <= bufferMs;
  }

  /**
   * Create wake trigger for notification system
   */
  static createWakeTrigger(
    wakeWindow: WakeWindow,
    sleepData: SleepData,
    currentStage: SleepStage
  ): WakeTrigger {
    return {
      timestamp: Date.now(),
      window: wakeWindow,
      sleepData,
      currentStage
    };
  }

  /**
   * Parse HH:MM time string to Date object (today)
   */
  private static parseTimeString(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Get gentle wake soundscape based on user's preferences
   */
  static getWakeSoundscape(userPreferences: {
    preferredSounds?: string[];
    volume?: number;
  }): {
    primarySound: string;
    secondarySounds: string[];
    duration: number;
    volume: number;
  } {
    return {
      primarySound: 'ocean-waves',
      secondarySounds: ['gentle-bells', 'nature-ambience'],
      duration: 30, // seconds
      volume: userPreferences.volume || 0.3
    };
  }

  /**
   * Get wake haptics pattern
   */
  static getWakeHaptics(): {
    pattern: number[];
    intensity: number;
    repeat: number;
  } {
    return {
      pattern: [0, 200, 100, 200, 100, 400], // vibration pattern in ms
      intensity: 0.4,
      repeat: 3
    };
  }
}
