const STORAGE_KEY = 'everdream_daily_checkin';

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
  } catch {
    // ignore quota errors
  }
  return next;
}