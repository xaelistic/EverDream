import { clampScore } from './sleepScoring';

export type CircadianWindow = {
  startMinute: number;
  endMinute: number;
};

export type CircadianAlignment = {
  score: number;
  preferredWindow: CircadianWindow;
  actualWindow: CircadianWindow;
  driftMinutes: number;
};

export type EducationTier = 'foundation' | 'rhythm-repair' | 'advanced';

export function buildPreferredSleepWindow(
  preferredBedtime = '22:30',
  preferredWakeTime = '06:30',
  targetSleepMinutes = 480
): CircadianWindow {
  const wake = parseClockTime(preferredWakeTime);
  const fallbackStart = normalizeMinute(wake - targetSleepMinutes);
  const start = preferredBedtime ? parseClockTime(preferredBedtime) : fallbackStart;
  const end = wake <= start ? wake + 1440 : wake;

  return {
    startMinute: start,
    endMinute: end,
  };
}

export function calculateCircadianAlignment(
  sleepStart: string | number | Date,
  sleepEnd: string | number | Date,
  preferredBedtime = '22:30',
  preferredWakeTime = '06:30',
  targetSleepMinutes = 480
): CircadianAlignment {
  const actualWindow = buildActualWindow(sleepStart, sleepEnd);
  const preferredWindow = buildPreferredSleepWindow(
    preferredBedtime,
    preferredWakeTime,
    targetSleepMinutes
  );

  const shiftedPreferred = closestWindowShift(preferredWindow, actualWindow);
  const overlap = overlapMinutes(actualWindow, shiftedPreferred);
  const actualDuration = Math.max(1, actualWindow.endMinute - actualWindow.startMinute);
  const overlapScore = (overlap / actualDuration) * 100;
  const startDrift = Math.abs(actualWindow.startMinute - shiftedPreferred.startMinute);
  const endDrift = Math.abs(actualWindow.endMinute - shiftedPreferred.endMinute);
  const driftMinutes = Math.round((startDrift + endDrift) / 2);
  const driftPenalty = Math.min(35, Math.max(0, driftMinutes - 45) / 4);

  return {
    score: clampScore(overlapScore - driftPenalty),
    preferredWindow: shiftedPreferred,
    actualWindow,
    driftMinutes,
  };
}

export function getEducationTier(score: number, alignmentScore: number): EducationTier {
  if (score >= 78 && alignmentScore >= 78) return 'advanced';
  if (alignmentScore < 62 || score < 58) return 'rhythm-repair';
  return 'foundation';
}

export function getCircadianEducation(tier: EducationTier): string {
  if (tier === 'advanced') {
    return 'Your rhythm is stable enough for deeper education: light timing, REM protection, and dream recall refinement.';
  }

  if (tier === 'rhythm-repair') {
    return 'Focus on rhythm repair this week: steady wake time, dimmer evenings, and a repeatable wind-down window.';
  }

  return 'Build the foundation first: enough hours, a consistent wake time, and a simple morning check-in.';
}

export function minuteToPercent(minute: number): number {
  return (normalizeMinute(minute) / 1440) * 100;
}

export function formatClockMinute(minute: number): string {
  const normalized = normalizeMinute(minute);
  const hours = Math.floor(normalized / 60).toString().padStart(2, '0');
  const minutes = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function buildActualWindow(
  sleepStart: string | number | Date,
  sleepEnd: string | number | Date
): CircadianWindow {
  const startDate = new Date(sleepStart);
  const endDate = new Date(sleepEnd);
  const start = startDate.getHours() * 60 + startDate.getMinutes();
  let end = endDate.getHours() * 60 + endDate.getMinutes();

  if (endDate.getTime() <= startDate.getTime() || end <= start) {
    end += 1440;
  }

  return { startMinute: start, endMinute: end };
}

function closestWindowShift(preferred: CircadianWindow, actual: CircadianWindow): CircadianWindow {
  const shifts = [-1440, 0, 1440].map((offset) => ({
    startMinute: preferred.startMinute + offset,
    endMinute: preferred.endMinute + offset,
  }));

  return shifts.reduce((best, candidate) => {
    const bestDistance = windowDistance(best, actual);
    const candidateDistance = windowDistance(candidate, actual);
    return candidateDistance < bestDistance ? candidate : best;
  }, shifts[0]);
}

function windowDistance(a: CircadianWindow, b: CircadianWindow): number {
  return Math.abs(a.startMinute - b.startMinute) + Math.abs(a.endMinute - b.endMinute);
}

function overlapMinutes(a: CircadianWindow, b: CircadianWindow): number {
  return Math.max(0, Math.min(a.endMinute, b.endMinute) - Math.max(a.startMinute, b.startMinute));
}

function parseClockTime(value: string): number {
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return normalizeMinute(hours * 60 + minutes);
}

function normalizeMinute(minute: number): number {
  return ((Math.round(minute) % 1440) + 1440) % 1440;
}
