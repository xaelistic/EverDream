import { describe, expect, it } from 'vitest';
import { mapWearableSleepToSummary } from './sleepSummary';

describe('mapWearableSleepToSummary', () => {
  it('maps Oura-style durationMinutes instead of inventing 450 minutes', () => {
    const summary = mapWearableSleepToSummary({
      date: '2026-08-22',
      bedtime: '2026-08-21T22:10:00.000Z',
      wakeTime: '2026-08-22T06:40:00.000Z',
      durationMinutes: 390,
      remMinutes: 88,
      deepMinutes: 70,
      lightMinutes: 210,
      awakeMinutes: 22,
      efficiency: 91,
      score: 84,
      source: 'oura',
    });

    expect(summary).not.toBeNull();
    expect(summary?.totalSleepMinutes).toBeGreaterThan(300);
    expect(summary?.stageMinutes.rem).toBe(88);
    expect(summary?.signalsSource).toBe('wearable');
  });

  it('returns null when the wearable record has no duration', () => {
    expect(
      mapWearableSleepToSummary({
        date: '2026-08-22',
        wakeTime: '2026-08-22T06:40:00.000Z',
      }),
    ).toBeNull();
  });
});
