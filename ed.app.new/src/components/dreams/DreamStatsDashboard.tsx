import React, { useMemo } from 'react';
import { Card, Badge, Skeleton } from '../ui';
import { Moon, Brain, Sparkles, TrendingUp, Calendar, Heart } from 'lucide-react';

/** Dream data shape for stats */
export interface DreamStats {
  id: string;
  title?: string;
  content: string;
  mood?: string;
  category: string;
  date: string;
  aiAnalysis?: {
    symbols: string[];
    themes: string[];
    interpretation: string;
  };
  imageUrl?: string;
}

export interface DreamStatsDashboardProps {
  dreams: DreamStats[];
  loading?: boolean;
}

/**
 * DreamStatsDashboard — Overview statistics for the dream journal.
 * Shows total dreams, streak, top moods, category breakdown, and recent activity.
 *
 * @example
 * <DreamStatsDashboard dreams={dreams} loading={isLoading} />
 */
export default function DreamStatsDashboard({ dreams, loading = false }: DreamStatsDashboardProps) {
  const stats = useMemo(() => {
    if (dreams.length === 0) {
      return {
        totalDreams: 0,
        currentStreak: 0,
        longestStreak: 0,
        topMoods: [] as { mood: string; count: number }[],
        categoryBreakdown: [] as { category: string; count: number }[],
        aiAnalyzed: 0,
        withImages: 0,
        avgLength: 0,
        thisWeek: 0,
        lastWeek: 0,
      };
    }

    // Total
    const totalDreams = dreams.length;

    // Streaks
    const sortedDates = dreams
      .map(d => new Date(d.date).toDateString())
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const uniqueDates = [...new Set(sortedDates)];

    let currentStreak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diff = (prev.getTime() - curr.getTime()) / 86400000;
        if (diff <= 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Longest streak
    let longestStreak = 1;
    let tempStreak = 1;
    const ascDates = [...uniqueDates].reverse();
    for (let i = 1; i < ascDates.length; i++) {
      const prev = new Date(ascDates[i - 1]);
      const curr = new Date(ascDates[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff <= 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    // Mood frequency
    const moodCounts: Record<string, number> = {};
    dreams.forEach(d => {
      if (d.mood) {
        moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1;
      }
    });
    const topMoods = Object.entries(moodCounts)
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Category breakdown
    const catCounts: Record<string, number> = {};
    dreams.forEach(d => {
      catCounts[d.category] = (catCounts[d.category] || 0) + 1;
    });
    const categoryBreakdown = Object.entries(catCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // AI & images
    const aiAnalyzed = dreams.filter(d => d.aiAnalysis).length;
    const withImages = dreams.filter(d => d.imageUrl).length;

    // Average content length
    const avgLength = Math.round(dreams.reduce((sum, d) => sum + d.content.length, 0) / dreams.length);

    // This week vs last week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);

    const thisWeek = dreams.filter(d => new Date(d.date) >= weekStart).length;
    const lastWeek = dreams.filter(d => {
      const dd = new Date(d.date);
      return dd >= lastWeekStart && dd < weekStart;
    }).length;

    return {
      totalDreams,
      currentStreak,
      longestStreak,
      topMoods,
      categoryBreakdown,
      aiAnalyzed,
      withImages,
      avgLength,
      thisWeek,
      lastWeek,
    };
  }, [dreams]);

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Skeleton lines={2} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '24px',
        }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}><Skeleton lines={2} /></Card>
          ))}
        </div>
      </div>
    );
  }

  const weekChange = stats.lastWeek === 0
    ? stats.thisWeek > 0 ? 100 : 0
    : Math.round(((stats.thisWeek - stats.lastWeek) / stats.lastWeek) * 100);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '2rem',
          color: '#1a1a2e',
          margin: '0 0 8px 0',
        }}>
          Dream Statistics
        </h1>
        <p style={{ color: '#9b96b0', fontSize: '0.85rem', margin: 0 }}>
          Insights from your subconscious mind
        </p>
      </div>

      {/* Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <StatCard
          icon={<Moon size={20} color="#5ec4a8" />}
          label="Total Dreams"
          value={stats.totalDreams.toString()}
          color="#5ec4a8"
        />
        <StatCard
          icon={<TrendingUp size={20} color="#9b8fd4" />}
          label="Current Streak"
          value={`${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}`}
          color="#9b8fd4"
        />
        <StatCard
          icon={<Calendar size={20} color="#c49a42" />}
          label="This Week"
          value={stats.thisWeek.toString()}
          subtitle={weekChange > 0 ? `+${weekChange}% vs last week` : weekChange < 0 ? `${weekChange}% vs last week` : 'Same as last week'}
          color="#c49a42"
        />
        <StatCard
          icon={<Brain size={20} color="#e88fa0" />}
          label="AI Analyzed"
          value={stats.aiAnalyzed.toString()}
          subtitle={stats.totalDreams > 0 ? `${Math.round((stats.aiAnalyzed / stats.totalDreams) * 100)}% of dreams` : undefined}
          color="#e88fa0"
        />
        <StatCard
          icon={<Sparkles size={20} color="#9b8fd4" />}
          label="With Images"
          value={stats.withImages.toString()}
          color="#9b8fd4"
        />
        <StatCard
          icon={<Heart size={20} color="#5ec4a8" />}
          label="Avg. Length"
          value={`${stats.avgLength} chars`}
          color="#5ec4a8"
        />
      </div>

      {/* Category Breakdown & Top Moods */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
      }}>
        {/* Category Breakdown */}
        <Card>
          <h3 style={{
            fontSize: '0.8rem', fontWeight: 700, color: '#4a4860',
            textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0',
          }}>
            Dream Categories
          </h3>
          {stats.categoryBreakdown.length === 0 ? (
            <p style={{ color: '#9b96b0', fontSize: '0.8rem' }}>No dreams recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.categoryBreakdown.map(({ category, count }) => {
                const pct = Math.round((count / stats.totalDreams) * 100);
                return (
                  <div key={category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#4a4860', fontWeight: 600, textTransform: 'capitalize' }}>
                        {category}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#9b96b0' }}>
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div style={{
                      height: '6px',
                      borderRadius: '3px',
                      background: 'rgba(168,237,220,0.15)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: '3px',
                        background: getCategoryColor(category),
                        transition: 'width 600ms ease-out',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top Moods */}
        <Card>
          <h3 style={{
            fontSize: '0.8rem', fontWeight: 700, color: '#4a4860',
            textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0',
          }}>
            Top Moods
          </h3>
          {stats.topMoods.length === 0 ? (
            <p style={{ color: '#9b96b0', fontSize: '0.8rem' }}>No mood data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.topMoods.map(({ mood, count }) => (
                <div key={mood} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{getMoodEmoji(mood)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#4a4860', fontWeight: 600, textTransform: 'capitalize' }}>
                        {mood}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#9b96b0' }}>{count}</span>
                    </div>
                    <div style={{
                      height: '4px',
                      borderRadius: '2px',
                      background: 'rgba(168,237,220,0.15)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.round((count / stats.totalDreams) * 100)}%`,
                        borderRadius: '2px',
                        background: 'linear-gradient(90deg, #5ec4a8, #9b8fd4)',
                        transition: 'width 600ms ease-out',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}

function StatCard({ icon, label, value, subtitle, color }: StatCardProps) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        {icon}
        <span style={{
          fontSize: '0.65rem', fontWeight: 600, color: '#9b96b0',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: '1.8rem', fontWeight: 700, color,
        fontFamily: "'Playfair Display', Georgia, serif",
        lineHeight: 1,
      }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.7rem', color: '#9b96b0', marginTop: '4px' }}>
          {subtitle}
        </div>
      )}
    </Card>
  );
}

/* ─── Helpers ─── */

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    normal: '#5ec4a8',
    lucid: '#9b8fd4',
    nightmare: '#e88fa0',
    recurring: '#c49a42',
    prophetic: '#5ec4a8',
    adventure: '#4a9e86',
    peaceful: '#5ec4a8',
    anxiety: '#c49a42',
  };
  return colors[category] || '#5ec4a8';
}

function getMoodEmoji(mood: string): string {
  const emojis: Record<string, string> = {
    peaceful: '😌',
    joyful: '😊',
    anxious: '😰',
    scary: '😨',
    confusing: '😵',
    exciting: '🤩',
    sad: '😢',
    neutral: '😐',
    fear: '😰',
    anger: '😠',
    surprise: '😲',
    wonder: '✨',
  };
  return emojis[mood] || '💭';
}
