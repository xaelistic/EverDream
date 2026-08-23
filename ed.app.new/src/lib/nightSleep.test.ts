import { describe, expect, it } from 'vitest';
import {
  formatSleepPromptBlock,
  mergeWearableRecords,
  wearableRecordToContext,
  type NightSleepContext,
} from './nightSleep';
import type { WearableSleepRecord } from './wearables';

function record(partial: Partial<WearableSleepRecord>): WearableSleepRecord {
  return {
    date: '2026-08-22',
    bedtime: '2026-08-21T22:00:00.000Z',
    wakeTime: '2026-08-22T06:30:00.000Z',
    durationMinutes: 480,
    remMinutes: 90,
    deepMinutes: 80,
    lightMinutes: 280,
    awakeMinutes: 30,
    efficiency: 88,
    score: 82,
    source: 'oura',
    ...partial,
  };
}

describe('night sleep helpers', () => {
  it('merges wearable nights by source and date without dropping earlier syncs', () => {
    const merged = mergeWearableRecords(
      [record({ source: 'oura', score: 80 })],
      [record({ source: 'fitbit', date: '2026-08-23', score: 70, durationMinutes: 400 })],
    );
    expect(merged).toHaveLength(2);
    expect(merged[0].date).toBe('2026-08-23');
  });

  it('formats sleep context for dream analysis', () => {
    const ctx: NightSleepContext = wearableRecordToContext(record({}));
    const block = formatSleepPromptBlock(ctx);
    expect(block).toContain('8h 0m');
    expect(block).toContain('REM 90m');
    expect(block).toContain('oura');
  });
});
