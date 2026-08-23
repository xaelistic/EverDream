const STORAGE_KEY = 'everdream_daily_checkin';
const HISTORY_KEY = 'everdream_daily_checkins';
export const CHECKIN_UPDATED_EVENT = 'everdream-checkin-updated';

export type EnergyLevel = 'good' | 'ok' | 'low';

export interface DailyCheckin {
  mood: string;
  energy: number;
  energyLevel: EnergyLevel;
  date: string;
}

export const ENERGY_LEVELS: Array<{
  id: EnergyLevel;
  emoji: string;
  label: string;
  hint: string;
  value: number;
}> = [
  { id: 'good', emoji: '✨', label: 'Good', hint: 'Rested & ready', value: 85 },
  { id: 'ok', emoji: '🌿', label: 'OK', hint: 'Steady enough', value: 50 },
  { id: 'low', emoji: '🌙', label: 'Not great', hint: 'Running low', value: 20 },
];

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function energyLevelFromValue(value: number): EnergyLevel {
  if (value >= 70) return 'good';
  if (value >= 35) return 'ok';
  return 'low';
}

export function loadDailyCheckin(): DailyCheckin | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyCheckin;
    if (parsed.date !== todayKey()) return null;
    return {
      ...parsed,
      energyLevel: parsed.energyLevel || energyLevelFromValue(parsed.energy ?? 50),
    };
  } catch {
    return null;
  }
}

export function saveDailyCheckin(partial: Partial<DailyCheckin>): DailyCheckin {
  const existing = loadDailyCheckin();
  const next: DailyCheckin = {
    mood: partial.mood ?? existing?.mood ?? '',
    energy: partial.energy ?? existing?.energy ?? 50,
    energyLevel: partial.energyLevel ?? existing?.energyLevel ?? 'ok',
    date: todayKey(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    const history = loadCheckinHistory();
    history[next.date] = next;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore quota errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHECKIN_UPDATED_EVENT, { detail: next }));
  }
  return next;
}

export function loadCheckinHistory(): Record<string, DailyCheckin> {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, DailyCheckin>) : {};
    const today = loadDailyCheckin();
    if (today) parsed[today.date] = today;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    const today = loadDailyCheckin();
    return today ? { [today.date]: today } : {};
  }
}

export function checkinForDate(dateKey: string): DailyCheckin | null {
  return loadCheckinHistory()[dateKey] || null;
}

/** Map morning energy to a 1–10 restedness rating for the tracker. */
export function restednessFromEnergyLevel(level?: EnergyLevel | ''): number {
  if (level === 'good') return 8;
  if (level === 'low') return 3;
  return 5;
}

export function feelingLabel(level?: EnergyLevel | ''): string {
  return ENERGY_LEVELS.find((row) => row.id === level)?.label || 'OK';
}

/** Visual direction for image generation from this morning's check-in. */
export function feelingImageCue(level?: EnergyLevel | ''): string {
  if (level === 'good') return 'waking mood rested and clear, warmer light, lifted atmosphere';
  if (level === 'low') return 'waking mood depleted, muted contrast, protective dusk hush, heavier air';
  if (level === 'ok') return 'waking mood steady, ordinary morning light, grounded colour';
  return '';
}

export function feelingAnalysisCue(checkin?: DailyCheckin | null): string {
  if (!checkin?.energyLevel) return '';
  const label = feelingLabel(checkin.energyLevel);
  const mood = checkin.mood ? ` Mood note: ${checkin.mood}.` : '';
  return `This morning they checked in as ${label} (${checkin.energyLevel}). Let waking mood colour emotional interpretation without overriding the dream's own symbols.${mood}`;
}