import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  attachDreamToSummary,
  buildMonthlySleepReport,
  calibrateSleepScore,
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
import { loadPhoneSleepSessions, SLEEP_UPDATED_EVENT } from '../lib/nightSleep';
import {
  CHECKIN_UPDATED_EVENT,
  loadCheckinHistory,
  restednessFromEnergyLevel,
  type DailyCheckin,
} from '../lib/dailyCheckin';

export type TrackerDay = {
  dateKey: string;
  label: string;
  dayLabel: string;
  isToday: boolean;
  summary: NightlySleepSummary | null;
  checkin: DailyCheckin | null;
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
  selectedCheckin: DailyCheckin | null;
  monthlyReport: MonthlySleepReport;
  currentMonth: Date;
  reloadSessions: () => void;
};

export function useSleepTracker({
  dreams,
  settings,
  wearableData = [],
}: UseSleepTrackerInput): UseSleepTrackerResult {
  const [storedSessions, setStoredSessions] = useState<SleepData[]>([]);
  const [checkins, setCheckins] = useState<Record<string, DailyCheckin>>({});
  const [selectedDate, setSelectedDate] = useState('');
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false);

  const reloadSessions = useCallback(() => {
    setStoredSessions(loadPhoneSleepSessions());
  }, []);

  useEffect(() => {
    reloadSessions();
    setCheckins(loadCheckinHistory());
    const onUpdate = () => reloadSessions();
    const onCheckin = () => setCheckins(loadCheckinHistory());
    window.addEventListener(SLEEP_UPDATED_EVENT, onUpdate);
    window.addEventListener(CHECKIN_UPDATED_EVENT, onCheckin);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener(SLEEP_UPDATED_EVENT, onUpdate);
      window.removeEventListener(CHECKIN_UPDATED_EVENT, onCheckin);
      window.removeEventListener('storage', onUpdate);
    };
  }, [reloadSessions]);

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
    const baseSummaries = [...mappedStored, ...mappedWearable, ...mappedDreamSleep];
    return applyMorningCheckins(linkDreamsToSummaries(baseSummaries, dreams), checkins);
  }, [checkins, dreams, settings, storedSessions, wearableData]);

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
    () => buildWeekDays(summaries, effectiveSelectedDate, checkins),
    [checkins, effectiveSelectedDate, summaries]
  );
  const selectedSummary = useMemo(
    () => summaries.find((summary) => summary.sleepDate === effectiveSelectedDate) || null,
    [effectiveSelectedDate, summaries]
  );
  const selectedCheckin = useMemo(() => {
    if (selectedSummary?.morningFeeling) {
      return checkins[selectedSummary.sleepEnd.slice(0, 10)]
        || checkins[selectedSummary.sleepDate]
        || null;
    }
    return checkins[effectiveSelectedDate] || null;
  }, [checkins, effectiveSelectedDate, selectedSummary]);
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
    selectedCheckin,
    monthlyReport,
    currentMonth,
    reloadSessions,
  };
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

function applyMorningCheckins(
  summaries: NightlySleepSummary[],
  checkins: Record<string, DailyCheckin>,
): NightlySleepSummary[] {
  return summaries.map((summary) => {
    const checkin = checkins[summary.sleepEnd.slice(0, 10)] || checkins[summary.sleepDate];
    if (!checkin?.energyLevel) return summary;
    const restedness = restednessFromEnergyLevel(checkin.energyLevel);
    const calibrated = calibrateSleepScore(
      summary.algorithmicSleepScore,
      restedness,
      summary.calibrationOffset,
    );
    return {
      ...summary,
      morningFeeling: checkin.energyLevel,
      morningMood: checkin.mood || undefined,
      restednessScore: restedness,
      calibratedSleepScore: calibrated.calibratedScore,
      calibrationOffset: calibrated.calibrationOffset,
    };
  });
}

function buildWeekDays(
  summaries: NightlySleepSummary[],
  selectedDate: string,
  checkins: Record<string, DailyCheckin> = {},
): TrackerDay[] {
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
      checkin: checkins[dateKey] || null,
    };
  });
}

function sourceRank(source: NightlySleepSummary['signalsSource']): number {
  if (source === 'native-device') return 4;
  if (source === 'wearable') return 3;
  if (source === 'browser-estimate') return 2;
  return 1;
}
