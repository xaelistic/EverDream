import { getSleepQualityLabel } from './sleepScoring';
import { toDateKey, type DreamLike, type NightlySleepSummary } from './sleepSummary';

export type MonthlyDreamHighlight = {
  dreamId: string;
  title: string;
  date: string;
  score: number;
  assetUrl?: string;
  assetScore?: number;
};

export type WeeklySleepBreakdown = {
  label: string;
  averageScore: number;
  trackedNights: number;
  goodNights: number;
  totalSleepHours: number;
};

export type MonthlySleepReport = {
  monthLabel: string;
  trackedNights: number;
  goodNights: number;
  averageScore: number;
  totalSleepHours: number;
  targetSleepHours: number;
  trendLabel: string;
  weeklyBreakdown: WeeklySleepBreakdown[];
  topDreams: MonthlyDreamHighlight[];
  worstDreams: MonthlyDreamHighlight[];
  topAssets: MonthlyDreamHighlight[];
  educationText: string;
  emailSubject: string;
  emailBody: string;
};

export function buildMonthlySleepReport(
  summaries: NightlySleepSummary[],
  dreams: DreamLike[],
  monthDate = new Date()
): MonthlySleepReport {
  const month = monthDate.getMonth();
  const year = monthDate.getFullYear();
  const monthSummaries = summaries
    .filter((summary) => {
      const date = new Date(`${summary.sleepDate}T12:00:00`);
      return date.getMonth() === month && date.getFullYear() === year;
    })
    .sort((a, b) => a.sleepDate.localeCompare(b.sleepDate));
  const trackedNights = monthSummaries.length;
  const goodNights = monthSummaries.filter((summary) => summary.calibratedSleepScore >= 75).length;
  const totalSleepHours = roundOne(
    monthSummaries.reduce((sum, summary) => sum + summary.totalSleepMinutes, 0) / 60
  );
  const targetSleepHours = roundOne(
    monthSummaries.reduce((sum, summary) => sum + summary.targetSleepMinutes, 0) / 60
  );
  const averageScore =
    trackedNights > 0
      ? Math.round(
          monthSummaries.reduce((sum, summary) => sum + summary.calibratedSleepScore, 0) /
            trackedNights
        )
      : 0;
  const dreamHighlights = buildDreamHighlights(monthSummaries, dreams);
  const educationText = chooseEducation(monthSummaries, averageScore);
  const monthLabel = monthDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  return {
    monthLabel,
    trackedNights,
    goodNights,
    averageScore,
    totalSleepHours,
    targetSleepHours,
    trendLabel: buildTrendLabel(monthSummaries),
    weeklyBreakdown: buildWeeklyBreakdown(monthSummaries),
    topDreams: dreamHighlights
      .filter((highlight) => highlight.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
    worstDreams: dreamHighlights
      .filter((highlight) => highlight.score > 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3),
    topAssets: dreamHighlights
      .filter((highlight) => Boolean(highlight.assetUrl))
      .sort((a, b) => (b.assetScore || 0) - (a.assetScore || 0))
      .slice(0, 3),
    educationText,
    emailSubject: `Your EverDream sleep report for ${monthLabel}`,
    emailBody: buildEmailBody(monthLabel, trackedNights, goodNights, averageScore, educationText),
  };
}

function buildDreamHighlights(
  summaries: NightlySleepSummary[],
  dreams: DreamLike[]
): MonthlyDreamHighlight[] {
  const dreamById = new Map(dreams.map((dream) => [dream.id, dream]));

  return summaries
    .filter((summary) => summary.dreamLogged && summary.dreamId)
    .map((summary) => {
      const dream = dreamById.get(summary.dreamId || '');
      return {
        dreamId: summary.dreamId || '',
        title:
          summary.dreamTitle ||
          dream?.nugget ||
          dream?.narrative ||
          dream?.content?.slice(0, 90) ||
          'Dream captured',
        date: summary.sleepDate,
        score: summary.calibratedSleepScore,
        assetUrl: summary.dreamAssetUrl || dream?.generatedImage?.url,
        assetScore: summary.dreamAssetScore || Number(dream?.assetMetadata?.rarityScore) || undefined,
      };
    });
}

function buildWeeklyBreakdown(summaries: NightlySleepSummary[]): WeeklySleepBreakdown[] {
  const byWeek = new Map<string, NightlySleepSummary[]>();

  for (const summary of summaries) {
    const weekStart = getWeekStart(summary.sleepDate);
    const list = byWeek.get(weekStart) || [];
    list.push(summary);
    byWeek.set(weekStart, list);
  }

  return Array.from(byWeek.entries()).map(([weekStart, weekSummaries]) => ({
    label: `Week of ${formatShortDate(weekStart)}`,
    averageScore: Math.round(
      weekSummaries.reduce((sum, summary) => sum + summary.calibratedSleepScore, 0) /
        weekSummaries.length
    ),
    trackedNights: weekSummaries.length,
    goodNights: weekSummaries.filter((summary) => summary.calibratedSleepScore >= 75).length,
    totalSleepHours: roundOne(
      weekSummaries.reduce((sum, summary) => sum + summary.totalSleepMinutes, 0) / 60
    ),
  }));
}

function buildTrendLabel(summaries: NightlySleepSummary[]): string {
  if (summaries.length < 4) return 'Collect more nights to see a stable trend.';

  const midpoint = Math.floor(summaries.length / 2);
  const first = summaries.slice(0, midpoint);
  const second = summaries.slice(midpoint);
  const firstAverage = averageScore(first);
  const secondAverage = averageScore(second);
  const delta = secondAverage - firstAverage;

  if (delta >= 6) return 'Sleep quality is trending up this month.';
  if (delta <= -6) return 'Sleep quality is drifting down this month.';
  return 'Sleep quality is broadly stable this month.';
}

function chooseEducation(summaries: NightlySleepSummary[], averageScore: number): string {
  if (summaries.length === 0) {
    return 'Start with a few nights of tracking so EverDream can find your rhythm.';
  }

  const averageAlignment = average(
    summaries.map((summary) => summary.circadianAlignmentScore)
  );
  const averageRem = average(summaries.map((summary) => summary.stageMinutes.rem));

  if (averageAlignment < 62) {
    return 'Your biggest lever is circadian consistency: keep wake time steady and reduce bright light late at night.';
  }

  if (averageRem < 80) {
    return 'Protect the final third of sleep this month. That is where dream-rich REM periods usually concentrate.';
  }

  if (averageScore >= 78) {
    return 'You can move into advanced practice: compare dream recall against REM timing and morning mood.';
  }

  return 'Focus on regular sleep opportunity and a short morning check-in after waking.';
}

function buildEmailBody(
  monthLabel: string,
  trackedNights: number,
  goodNights: number,
  averageScore: number,
  educationText: string
): string {
  const quality = getSleepQualityLabel(averageScore).toLowerCase();
  return `In ${monthLabel}, you tracked ${trackedNights} nights and had ${goodNights} good nights of sleep. Your average sleep score was ${averageScore}/100, which EverDream classifies as ${quality}. ${educationText}`;
}

function averageScore(summaries: NightlySleepSummary[]): number {
  if (summaries.length === 0) return 0;
  return average(summaries.map((summary) => summary.calibratedSleepScore));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getWeekStart(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toDateKey(date);
}

function formatShortDate(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}
