import { Calendar, TrendingUp, Moon } from 'lucide-react';
import StatCard from './StatCard';
import InsightCard from './InsightCard';
import EmptyState from './EmptyState';

type WeeklyReportProps = {
  dreams: any[];
  wearableData: any[];
};

type WeeklyInsights = {
  totalSleep: number;
  avgSleepQuality: number;
  dreamCount: number;
  topThemes: Array<[string, number]>;
  moodSummary: Record<string, number>;
  recommendations: string[];
} | null;

function getWeeklyInsights(dreams: any[], wearableData: any[]): WeeklyInsights {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const weekDreams = dreams.filter((d) => {
    const dreamDate = new Date(d.date);
    return dreamDate >= weekAgo && !d.isSample;
  });

  const weekSleepLogs = wearableData.filter((log) => {
    const logDate = new Date(log.created_at || log.bedtime);
    return logDate >= weekAgo;
  });

  if (weekDreams.length === 0 && weekSleepLogs.length === 0) {
    return null;
  }

  // Total sleep time
  const totalSleep = weekSleepLogs.reduce((sum, log) => sum + (log.sleep_duration || 0), 0);
  
  // Average sleep quality
  const sleepLogsForQuality = weekSleepLogs.length > 0 ? weekSleepLogs : weekDreams.filter((d) => d.sleepData);
  const avgSleepQuality = sleepLogsForQuality.length > 0
    ? Math.round(sleepLogsForQuality.reduce((sum, log) => sum + (log.quality || log.sleepData?.quality || 0), 0) / sleepLogsForQuality.length)
    : 0;

  // Top themes
  const themeCount: Record<string, number> = {};
  weekDreams.forEach((d) => {
    d.themes?.forEach((theme: string) => {
      themeCount[theme] = (themeCount[theme] || 0) + 1;
    });
  });
  const topThemes = Object.entries(themeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as Array<[string, number]>;

  // Mood summary
  const moodSummary: Record<string, number> = {};
  weekDreams.forEach((d) => {
    moodSummary[d.emotion] = (moodSummary[d.emotion] || 0) + 1;
  });

  // Generate recommendations
  const recommendations: string[] = [];
  if (avgSleepQuality < 70) {
    recommendations.push('Consider improving sleep hygiene: dark room, cool temperature');
  }
  if (totalSleep < 7 * 6 * 60) { // Less than 7 hours average
    recommendations.push('Try to get 7-9 hours of sleep per night');
  }
  if (weekDreams.filter((d) => d.category === 'anxious').length > weekDreams.length / 2) {
    recommendations.push('High anxiety dreams detected. Consider relaxation techniques before bed');
  }
  if (recommendations.length === 0) {
    recommendations.push('Great sleep patterns! Keep maintaining your routine');
  }

  return {
    totalSleep: Math.round(totalSleep / 60), // Convert to hours
    avgSleepQuality,
    dreamCount: weekDreams.length,
    topThemes,
    moodSummary,
    recommendations,
  };
}

export default function WeeklyReport({ dreams, wearableData }: WeeklyReportProps) {
  const insights = getWeeklyInsights(dreams, wearableData);

  if (!insights) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-ink mb-2">Weekly Report</h1>
          <p className="text-muted text-sm">Last 7 days summary</p>
        </div>
        <EmptyState icon={Calendar} message="No data for this week yet" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-semibold text-ink mb-2">Weekly Report</h1>
        <p className="text-muted text-sm">Last 7 days summary</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Moon} value={`${insights.totalSleep}h`} label="Total Sleep" />
        <StatCard icon={TrendingUp} value={`${insights.avgSleepQuality}%`} label="Avg Quality" />
        <StatCard icon={Calendar} value={insights.dreamCount} label="Dreams" />
      </div>

      {/* Sleep Overview */}
      <InsightCard
        title="Sleep Summary"
        icon={Moon}
        items={[
          { label: 'Total Sleep', value: `${insights.totalSleep} hours` },
          { label: 'Daily Average', value: `${(insights.totalSleep / 7).toFixed(1)} hours` },
          { label: 'Sleep Quality', value: `${insights.avgSleepQuality}%` },
          { label: 'Dreams Recorded', value: insights.dreamCount },
        ]}
      />

      {/* Dream Themes */}
      {insights.topThemes.length > 0 && (
        <InsightCard
          title="Top Dream Themes"
          icon={Calendar}
          items={insights.topThemes.map(([theme, count]) => ({
            label: theme,
            value: count,
          }))}
        />
      )}

      {/* Mood Distribution */}
      {Object.keys(insights.moodSummary).length > 0 && (
        <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
          <h3 className="font-semibold mb-3 text-sm text-ink">Mood Distribution</h3>
          <div className="space-y-2">
            {Object.entries(insights.moodSummary)
              .sort((a, b) => b[1] - a[1])
              .map(([mood, count]) => (
                <div key={mood} className="flex justify-between items-center">
                  <span className="text-muted capitalize">{mood}</span>
                  <span className="font-semibold text-ink">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="rounded-2xl border border-line bg-gradient-to-br from-sage/10 to-parchment p-5 shadow-paper">
        <h3 className="font-semibold mb-3 text-sm text-ink flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sageDark" strokeWidth={1.5} />
          Recommendations
        </h3>
        <ul className="space-y-2 text-sm text-muted">
          {insights.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-sageDark mt-0.5">•</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
