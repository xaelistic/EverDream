import { Calendar, TrendingUp, Moon } from 'lucide-react';
import StatCard from './StatCard';
import InsightCard from './InsightCard';
import EmptyState from './EmptyState';

type MonthlyReportProps = {
  dreams: any[];
  wearableData: any[];
};

type MonthlyInsights = {
  totalSleep: number;
  avgSleepQuality: number;
  dreamCount: number;
  topThemes: Array<[string, number]>;
  moodSummary: Record<string, number>;
  bestNight: { date: string; quality: number };
  recommendations: string[];
  trends: {
    sleepQualityTrend: 'improving' | 'declining' | 'stable';
    dreamFrequencyTrend: 'increasing' | 'decreasing' | 'stable';
  };
} | null;

function getMonthlyInsights(dreams: any[], wearableData: any[]): MonthlyInsights {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const monthDreams = dreams.filter((d) => {
    const dreamDate = new Date(d.date);
    return dreamDate >= monthAgo && !d.isSample;
  });

  const monthSleepLogs = wearableData.filter((log) => {
    const logDate = new Date(log.created_at || log.bedtime);
    return logDate >= monthAgo;
  });

  if (monthDreams.length === 0 && monthSleepLogs.length === 0) {
    return null;
  }

  // Total sleep time
  const totalSleep = monthSleepLogs.reduce((sum, log) => sum + (log.sleep_duration || 0), 0);
  
  // Average sleep quality
  const sleepLogsForQuality = monthSleepLogs.length > 0 ? monthSleepLogs : monthDreams.filter((d) => d.sleepData);
  const avgSleepQuality = sleepLogsForQuality.length > 0
    ? Math.round(sleepLogsForQuality.reduce((sum, log) => sum + (log.quality || log.sleepData?.quality || 0), 0) / sleepLogsForQuality.length)
    : 0;

  // Best night
  let bestNight = { date: '', quality: 0 };
  sleepLogsForQuality.forEach((log) => {
    const quality = log.quality || log.sleepData?.quality || 0;
    if (quality > bestNight.quality) {
      bestNight = {
        date: new Date(log.created_at || log.bedtime || log.sleepData?.wakeTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        quality,
      };
    }
  });

  // Top themes
  const themeCount: Record<string, number> = {};
  monthDreams.forEach((d) => {
    d.themes?.forEach((theme: string) => {
      themeCount[theme] = (themeCount[theme] || 0) + 1;
    });
  });
  const topThemes = Object.entries(themeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as Array<[string, number]>;

  // Mood summary
  const moodSummary: Record<string, number> = {};
  monthDreams.forEach((d) => {
    moodSummary[d.emotion] = (moodSummary[d.emotion] || 0) + 1;
  });

  // Trends (compare first half vs second half of month)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const firstHalfDreams = monthDreams.filter((d) => new Date(d.date) < twoWeeksAgo);
  const secondHalfDreams = monthDreams.filter((d) => new Date(d.date) >= twoWeeksAgo);
  
  const dreamFrequencyTrend = secondHalfDreams.length > firstHalfDreams.length 
    ? 'increasing' 
    : secondHalfDreams.length < firstHalfDreams.length 
    ? 'decreasing' 
    : 'stable';

  const firstHalfQuality = sleepLogsForQuality
    .filter((log) => new Date(log.created_at || log.bedtime) < twoWeeksAgo)
    .reduce((sum, log) => sum + (log.quality || log.sleepData?.quality || 0), 0);
  const secondHalfQuality = sleepLogsForQuality
    .filter((log) => new Date(log.created_at || log.bedtime) >= twoWeeksAgo)
    .reduce((sum, log) => sum + (log.quality || log.sleepData?.quality || 0), 0);
  
  const avgFirstHalf = firstHalfQuality / Math.max(1, sleepLogsForQuality.filter((log) => new Date(log.created_at || log.bedtime) < twoWeeksAgo).length);
  const avgSecondHalf = secondHalfQuality / Math.max(1, sleepLogsForQuality.filter((log) => new Date(log.created_at || log.bedtime) >= twoWeeksAgo).length);
  
  const sleepQualityTrend = avgSecondHalf > avgFirstHalf + 5
    ? 'improving'
    : avgSecondHalf < avgFirstHalf - 5
    ? 'declining'
    : 'stable';

  // Generate recommendations
  const recommendations: string[] = [];
  if (avgSleepQuality < 70) {
    recommendations.push('Focus on sleep hygiene: consistent schedule, dark room');
  }
  if (totalSleep < 30 * 7 * 60) { // Less than 7 hours average per night
    recommendations.push('Aim for 7-9 hours of sleep consistently');
  }
  if (monthDreams.filter((d) => d.category === 'anxious').length > monthDreams.length / 3) {
    recommendations.push('Consider stress reduction techniques before bedtime');
  }
  if (sleepQualityTrend === 'declining') {
    recommendations.push('Your sleep quality has declined. Review recent lifestyle changes');
  }
  if (recommendations.length === 0) {
    recommendations.push('Excellent patterns! Continue your healthy sleep habits');
  }

  return {
    totalSleep: Math.round(totalSleep / 60), // Convert to hours
    avgSleepQuality,
    dreamCount: monthDreams.length,
    topThemes,
    moodSummary,
    bestNight,
    recommendations,
    trends: {
      sleepQualityTrend,
      dreamFrequencyTrend,
    },
  };
}

export default function MonthlyReport({ dreams, wearableData }: MonthlyReportProps) {
  const insights = getMonthlyInsights(dreams, wearableData);

  if (!insights) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-ink mb-2">Monthly Report</h1>
          <p className="text-muted text-sm">Last 30 days summary</p>
        </div>
        <EmptyState icon={Calendar} message="No data for this month yet" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-semibold text-ink mb-2">Monthly Report</h1>
        <p className="text-muted text-sm">Last 30 days summary</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Moon} value={`${Math.round(insights.totalSleep / 30)}h`} label="Daily Avg" />
        <StatCard icon={TrendingUp} value={`${insights.avgSleepQuality}%`} label="Avg Quality" />
        <StatCard icon={Calendar} value={insights.dreamCount} label="Dreams" />
      </div>

      {/* Sleep Overview */}
      <InsightCard
        title="Monthly Sleep Summary"
        icon={Moon}
        items={[
          { label: 'Total Sleep', value: `${insights.totalSleep} hours` },
          { label: 'Daily Average', value: `${(insights.totalSleep / 30).toFixed(1)} hours` },
          { label: 'Sleep Quality', value: `${insights.avgSleepQuality}%` },
          { label: 'Best Night', value: insights.bestNight.date, badge: true },
        ]}
      />

      {/* Trends */}
      <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
        <h3 className="font-semibold mb-3 text-sm text-ink flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sageDark" strokeWidth={1.5} />
          Trends
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted">Sleep Quality</span>
            <span className={`text-sm font-semibold capitalize ${
              insights.trends.sleepQualityTrend === 'improving' ? 'text-green-600' :
              insights.trends.sleepQualityTrend === 'declining' ? 'text-red-500' : 'text-muted'
            }`}>
              {insights.trends.sleepQualityTrend}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">Dream Frequency</span>
            <span className={`text-sm font-semibold capitalize ${
              insights.trends.dreamFrequencyTrend === 'increasing' ? 'text-green-600' :
              insights.trends.dreamFrequencyTrend === 'decreasing' ? 'text-red-500' : 'text-muted'
            }`}>
              {insights.trends.dreamFrequencyTrend}
            </span>
          </div>
        </div>
      </div>

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
