/**
 * Last-night sleep context for the tracker, wearable sync, and dream analysis.
 */

import type { WearableSleepRecord } from './wearables';
import type { SleepData } from '../modules/sleep/types';

export const SLEEP_UPDATED_EVENT = 'everdream-sleep-updated';
export const SLEEP_SESSIONS_KEY = 'sleep_completed_sessions';

export type NightSleepContext = {
  date: string;
  source: string;
  durationMinutes: number;
  remMinutes: number;
  deepMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
  efficiency?: number;
  score?: number;
  bedtime?: string;
  wakeTime?: string;
};

export function notifySleepUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SLEEP_UPDATED_EVENT));
}

export function loadPhoneSleepSessions(): SleepData[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(SLEEP_SESSIONS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePhoneSleepSessions(sessions: SleepData[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SLEEP_SESSIONS_KEY, JSON.stringify(sessions));
  notifySleepUpdated();
}

export function phoneSessionToContext(session: SleepData): NightSleepContext | null {
  if (!session?.sleepOnset || !session.wakeTime) return null;
  const stages = session.stageBreakdown || { awake: 0, light: 0, deep: 0, rem: 0 };
  return {
    date: new Date(session.sleepOnset).toISOString().slice(0, 10),
    source: 'phone',
    durationMinutes: session.totalDuration || 0,
    remMinutes: stages.rem || 0,
    deepMinutes: stages.deep || 0,
    lightMinutes: stages.light || 0,
    awakeMinutes: stages.awake || 0,
    efficiency: session.efficiency,
    score: session.algorithmicScore,
    bedtime: new Date(session.sleepOnset).toISOString(),
    wakeTime: new Date(session.wakeTime).toISOString(),
  };
}

export function wearableRecordToContext(record: WearableSleepRecord): NightSleepContext {
  return {
    date: record.date,
    source: record.source || 'wearable',
    durationMinutes: record.durationMinutes,
    remMinutes: record.remMinutes,
    deepMinutes: record.deepMinutes,
    lightMinutes: record.lightMinutes,
    awakeMinutes: record.awakeMinutes,
    efficiency: record.efficiency,
    score: record.score,
    bedtime: record.bedtime,
    wakeTime: record.wakeTime,
  };
}

export function mergeWearableRecords(
  previous: WearableSleepRecord[],
  incoming: WearableSleepRecord[],
): WearableSleepRecord[] {
  const map = new Map<string, WearableSleepRecord>();
  for (const record of [...previous, ...incoming]) {
    if (!record?.date) continue;
    map.set(`${record.source || 'wearable'}-${record.date}`, record);
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function loadStoredWearableRecords(): WearableSleepRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('ed.wearableData');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function latestNightSleep(wearableData?: WearableSleepRecord[]): NightSleepContext | null {
  const fromPhone = loadPhoneSleepSessions()
    .map(phoneSessionToContext)
    .filter((item): item is NightSleepContext => Boolean(item));
  const fromWearable = (wearableData ?? loadStoredWearableRecords()).map(wearableRecordToContext);
  const all = [...fromPhone, ...fromWearable].sort((a, b) => {
    const ta = a.wakeTime || a.date;
    const tb = b.wakeTime || b.date;
    return tb.localeCompare(ta);
  });
  return all[0] || null;
}

export function formatSleepPromptBlock(sleep: NightSleepContext): string {
  const hours = Math.floor(sleep.durationMinutes / 60);
  const minutes = sleep.durationMinutes % 60;
  return [
    `Last night's sleep (${sleep.source}): ${hours}h ${minutes}m`,
    `REM ${sleep.remMinutes}m, deep ${sleep.deepMinutes}m, light ${sleep.lightMinutes}m, awake ${sleep.awakeMinutes}m`,
    sleep.efficiency != null ? `Efficiency ${sleep.efficiency}%` : '',
    sleep.score != null ? `Sleep score ${sleep.score}` : '',
    'Use this as health context. Short or fragmented sleep may colour anxiety/nightmare themes; high REM often tracks with vivid or lucid imagery. Do not invent extra numbers.',
  ]
    .filter(Boolean)
    .join('. ');
}

export function sleepContextToDreamSleepData(sleep: NightSleepContext) {
  return {
    bedtime: sleep.bedtime,
    wakeTime: sleep.wakeTime,
    sleepDuration: sleep.durationMinutes,
    estimatedREM: sleep.remMinutes,
    remDuration: sleep.remMinutes,
    deepDuration: sleep.deepMinutes,
    quality: sleep.score ?? sleep.efficiency ?? 0,
    source: sleep.source,
    stages: [
      { phase: 'awake', duration: sleep.awakeMinutes },
      { phase: 'light', duration: sleep.lightMinutes },
      { phase: 'deep', duration: sleep.deepMinutes },
      { phase: 'rem', duration: sleep.remMinutes },
    ],
  };
}
