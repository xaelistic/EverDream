import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  attachDreamToSummary,
  buildDemoSleepSummaries,
  buildMonthlySleepReport,
  mapDreamSleepToSummary,
  mapLegacySleepDataToSummary,
  mapWearableSleepToSummary,
  toDateKey,
  type DreamLike,
  type MonthlySleepReport,
  type NightlySleepSummary,
  type TrackerSettings,
  type WearableSleepLike,
} from '../modules/sleep';
import type { SleepData } from '../modules/sleep/types';

const SLEEP_SESSIONS_KEY = 'sleep_completed_sessions';

export type TrackerDay = {
  dateKey: string;
  label: string;
  dayLabel: string;
  isToday: boolean;
  summary: NightlySleepSummary | null;
};

type UseSleepTrackerInput = {
  dreams: DreamLike[];
  settings?: TrackerSettings;
  wearableData?: WearableSleepLike[];
};

type UseSleepTrackerResult = {
  summaries: NightlySleepSummary[];
  weekDays: TrackerDay[];
  selectedDate: string;
  setSelectedDate: (dateKey: string) => void;
  selectedSummary: NightlySleepSummary | null;
  monthlyReport: MonthlySleepReport;
  currentMonth: Date;
};

export function useSleepTracker({
  dreams,
  settings,
  wearableData = [],
}: UseSleepTrackerInput): UseSleepTrackerResult {
  const [storedSessions, setStoredSessions] = useState<SleepData[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false);

  useEffect(() => {
    setStoredSessions(loadStoredSleepSessions());
  }, []);

  const summaries = useMemo(() => {
    const mappedStored = storedSessions
      .map((session) => mapLegacySleepDataToSummary(session, settings))
      .filter(Boolean) as NightlySleepSummary[];
    const mappedWearable = wearableData
      .map((session) => mapWearableSleepToSummary(session, settings))
      .filter(Boolean) as NightlySleepSummary[];
    const mappedDreamSleep = dreams
      .map((dream) => mapDreamSleepToSummary(dream, settings))
      .filter(Boolean) as NightlySleepSummary[];
    const baseSummaries =
      mappedStored.length + mappedWearable.length + mappedDreamSleep.length > 0
        ? [...mappedStored, ...mappedWearable, ...mappedDreamSleep]
        : buildDemoSleepSummaries(settings);

    return linkDreamsToSummaries(baseSummaries, dreams);
  }, [dreams, settings, storedSessions, wearableData]);

  useEffect(() => {
    const selectedHasSummary = summaries.some((summary) => summary.sleepDate === selectedDate);
    if (summaries[0] && (!selectedDate || (!hasUserSelectedDate && !selectedHasSummary))) {
      setSelectedDate(summaries[0].sleepDate);
    }
  }, [hasUserSelectedDate, selectedDate, summaries]);

  const selectDate = useCallback((dateKey: string) => {
    setHasUserSelectedDate(true);
    setSelectedDate(dateKey);
  }, []);

  const effectiveSelectedDate = selectedDate || summaries[0]?.sleepDate || toDateKey(new Date());
  const weekDays = useMemo(
    () => buildWeekDays(summaries, effectiveSelectedDate),
    [effectiveSelectedDate, summaries]
  );
  const selectedSummary = useMemo(
    () => summaries.find((summary) => summary.sleepDate === effectiveSelectedDate) || null,
    [effectiveSelectedDate, summaries]
  );
  const currentMonth = useMemo(
    () => new Date(`${effectiveSelectedDate}T12:00:00`),
    [effectiveSelectedDate]
  );
  const monthlyReport = useMemo(
    () => buildMonthlySleepReport(summaries, dreams, currentMonth),
    [currentMonth, dreams, summaries]
  );

  return {
    summaries,
    weekDays,
    selectedDate: effectiveSelectedDate,
    setSelectedDate: selectDate,
    selectedSummary,
    monthlyReport,
    currentMonth,
  };
}

function loadStoredSleepSessions(): SleepData[] {
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

function linkDreamsToSummaries(
  summaries: NightlySleepSummary[],
  dreams: DreamLike[]
): NightlySleepSummary[] {
  const summaryByDate = new Map<string, NightlySleepSummary>();

  for (const summary of summaries) {
    const existing = summaryByDate.get(summary.sleepDate);
    if (!existing || sourceRank(summary.signalsSource) >= sourceRank(existing.signalsSource)) {
      summaryByDate.set(summary.sleepDate, summary);
    }
  }

  for (const dream of dreams) {
    if (!dream.date || dream.isSample) continue;
    const dateKey = toDateKey(dream.date);
    const existing = summaryByDate.get(dateKey);

    if (existing) {
      summaryByDate.set(dateKey, attachDreamToSummary(existing, dream));
    }
  }

  return Array.from(summaryByDate.values()).sort((a, b) => b.sleepDate.localeCompare(a.sleepDate));
}

function buildWeekDays(summaries: NightlySleepSummary[], selectedDate: string): TrackerDay[] {
  const selected = new Date(`${selectedDate}T12:00:00`);
  const monday = new Date(selected);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  const todayKey = toDateKey(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateKey = toDateKey(date);
    const summary = summaries.find((item) => item.sleepDate === dateKey) || null;

    return {
      dateKey,
      label: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      dayLabel: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      isToday: dateKey === todayKey,
      summary,
    };
  });
}

function sourceRank(source: NightlySleepSummary['signalsSource']): number {
  if (source === 'native-device') return 4;
  if (source === 'wearable') return 3;
  if (source === 'browser-estimate') return 2;
  return 1;
}
