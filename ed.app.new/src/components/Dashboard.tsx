import { Moon, Shield, Zap, TrendingUp, Calendar, Brain } from 'lucide-react';
import StatCard from './StatCard';
import InsightCard from './InsightCard';
import EmptyState from './EmptyState';

type DashboardProps = {
  dreams: any[];
  wearableData: any[];
};

type Insights = {
  totalDreams: number;
  currentStreak: number;
  mostCommonCategory?: string[];
  avgRarity: string;
  totalAssetValue: number;
  avgSleepQuality: number;
  avgREMTime: number;
  moodTimeline?: Array<{ date: string; mood: string; energy: number }>;
  topThemes: Array<[string, number]>;
} | null;

function getDashboardInsights(dreams: any[], wearableData: any[]): Insights {
  if (!dreams || dreams.length === 0) return null;

  const nonSampleDreams = dreams.filter((d) => !d.isSample);
  
  if (nonSampleDreams.length === 0) {
    return {
      totalDreams: 0,
      currentStreak: 0,
      avgRarity: '0.00',
      totalAssetValue: 0,
      avgSleepQuality: 0,
      avgREMTime: 0,
      topThemes: [],
    };
  }

  // Calculate streak
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const hasDream = nonSampleDreams.some((d) => {
      const dreamDate = new Date(d.date);
      dreamDate.setHours(0, 0, 0, 0);
      return dreamDate.getTime() === checkDate.getTime();
    });
    if (hasDream) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  // Calculate average rarity
  const dreamsWithMetadata = nonSampleDreams.filter((d) => d.assetMetadata?.rarityScore);
  const avgRarity = dreamsWithMetadata.length > 0
    ? (dreamsWithMetadata.reduce((sum, d) => sum + (d.assetMetadata.rarityScore || 0), 0) / dreamsWithMetadata.length).toFixed(2)
    : '0.00';

  // Calculate total asset value (simulated)
  const totalAssetValue = dreamsWithMetadata.reduce((sum, d) => {
    const rarity = d.assetMetadata?.rarityScore || 0;
    return sum + Math.round(rarity * 100);
  }, 0);

  // Most common category
  const categoryCount: Record<string, number> = {};
  nonSampleDreams.forEach((d) => {
    categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
  });
  const mostCommonCategory = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .map(([cat]) => cat);

  // Sleep quality from wearable data or dream sleep data
  const sleepLogs = wearableData.length > 0 ? wearableData : nonSampleDreams.filter((d) => d.sleepData);
  const avgSleepQuality = sleepLogs.length > 0
    ? Math.round(sleepLogs.reduce((sum, log) => sum + (log.quality || log.sleepData?.quality || 0), 0) / sleepLogs.length)
    : 0;

  const avgREMTime = sleepLogs.length > 0
    ? Math.round(sleepLogs.reduce((sum, log) => sum + (log.estimated_rem || log.sleepData?.estimatedREM || 0), 0) / sleepLogs.length)
    : 0;

  // Mood timeline (last 7 days)
  const moodTimeline: Array<{ date: string; mood: string; energy: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayDreams = nonSampleDreams.filter((d) => {
      const dreamDate = new Date(d.date);
      return dreamDate.toDateString() === date.toDateString();
    });
    if (dayDreams.length > 0) {
      moodTimeline.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        mood: dayDreams[0].emotion || 'neutral',
        energy: 50 + Math.random() * 50,
      });
    }
  }

  // Top themes
  const themeCount: Record<string, number> = {};
  nonSampleDreams.forEach((d) => {
    d.themes?.forEach((theme: string) => {
      themeCount[theme] = (themeCount[theme] || 0) + 1;
    });
  });
  const topThemes = Object.entries(themeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as Array<[string, number]>;

  return {
    totalDreams: nonSampleDreams.length,
    currentStreak: streak,
    mostCommonCategory,
    avgRarity,
    totalAssetValue,
    avgSleepQuality,
    avgREMTime,
    moodTimeline,
    topThemes,
  };
}

export default function Dashboard({ dreams, wearableData }: DashboardProps) {
  const insights = getDashboardInsights(dreams, wearableData);

  if (!insights || insights.totalDreams === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-ink mb-2">Your Dashboard</h1>
          <p className="text-muted text-sm">Track your sleep and dream journey</p>
        </div>
        <EmptyState icon={Moon} message="Start recording your dreams to see your dashboard" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-semibold text-ink mb-2">Your Dashboard</h1>
        <p className="text-muted text-sm">Track your sleep and dream journey</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Calendar} value={insights.totalDreams} label="Dreams" />
        <StatCard icon={TrendingUp} value={`${insights.currentStreak}`} label="Day Streak" />
        <StatCard icon={Shield} value={insights.avgRarity} label="Avg Depth" />
      </div>

      {/* Sleep Quality Card */}
      <InsightCard
        title="Sleep Overview"
        icon={Moon}
        items={[
          { label: 'Avg Sleep Quality', value: `${insights.avgSleepQuality}%` },
          { label: 'Avg REM Sleep', value: `${insights.avgREMTime} min` },
          { label: 'Total Dreams', value: insights.totalDreams },
          { label: 'Current Streak', value: `${insights.currentStreak} days` },
        ]}
      />

      {/* Dream Themes */}
      {insights.topThemes.length > 0 && (
        <InsightCard
          title="Top Dream Themes"
          icon={Brain}
          items={insights.topThemes.map(([theme, count]) => ({
            label: theme,
            value: count,
          }))}
        />
      )}

      {/* Asset Value */}
      <div className="rounded-2xl border border-line bg-gradient-to-br from-sage/10 to-parchment p-5 shadow-paper">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-sageDark" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-semibold text-ink">Dream Collection Value</h3>
            <p className="text-xs text-muted">Based on rarity and uniqueness</p>
          </div>
        </div>
        <div className="text-3xl font-bold text-sageDark">${insights.totalAssetValue}</div>
        <div className="mt-3 text-xs text-muted">
          {dreams.filter((d) => !d.isSample && d.assetMetadata).length} dreams with metadata
        </div>
      </div>

      {/* Most Common Dream Type */}
      {insights.mostCommonCategory && (
        <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
          <h3 className="font-semibold mb-2 text-sm text-ink">Most Common Dream Type</h3>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-serif text-sageDark capitalize">
              {insights.mostCommonCategory[0]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
