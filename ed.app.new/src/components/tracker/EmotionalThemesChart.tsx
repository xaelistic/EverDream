import { TrendingUp, Sparkles } from 'lucide-react';
import type { DreamLike, NightlySleepSummary } from '../../modules/sleep';

type EmotionalThemesChartProps = {
  dreams: DreamLike[];
  summaries: NightlySleepSummary[];
};

type EmotionCategory = {
  label: string;
  emoji: string;
  score: number;
  count: number;
};

export function EmotionalThemesChart({ dreams, summaries }: EmotionalThemesChartProps) {
  // Analyze emotional valences from dreams and sleep data
  const emotions = analyzeEmotions(dreams, summaries);
  
  // Calculate rolling averages for the spider/radar chart
  const maxScore = Math.max(1, ...emotions.map(e => e.score));

  return (
    <div className="rounded-3xl border border-line bg-cream p-5 shadow-lift">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Emotional landscape</p>
          <h3 className="font-serif text-xl font-medium text-ink">Dream themes & emotions</h3>
        </div>
        <Sparkles className="h-6 w-6 text-duskDeep" strokeWidth={1.5} />
      </div>

      {/* Spider/Radar diagram using CSS */}
      <div className="relative mb-6 flex aspect-square max-w-xs mx-auto items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-line opacity-30" />
        <div className="absolute h-2/3 w-2/3 rounded-full border border-line opacity-40" />
        <div className="absolute h-1/3 w-1/3 rounded-full border border-line opacity-50" />
        
        {/* Axis lines */}
        {emotions.map((emotion, index) => {
          const angle = (index / emotions.length) * 360 - 90;
          const radius = 45;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          const normalizedScore = emotion.score / maxScore;
          const dotX = x * normalizedScore;
          const dotY = y * normalizedScore;

          return (
            <div key={emotion.label} className="absolute inset-0">
              {/* Axis line */}
              <div
                className="absolute left-1/2 top-1/2 h-px w-1/2 origin-left bg-line opacity-40"
                style={{ transform: `rotate(${angle + 90}deg)` }}
              />
              {/* Data point */}
              <div
                className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{
                  transform: `translate(${dotX}%, ${dotY}%)`,
                }}
              >
                <div className="h-3 w-3 rounded-full bg-duskDeep shadow-sm" />
                <span className="mt-1 text-[10px] font-medium text-muted">{emotion.emoji}</span>
              </div>
            </div>
          );
        })}

        {/* Center label */}
        <div className="z-10 text-center">
          <div className="text-2xl">
            {getDominantEmoji(emotions)}
          </div>
          <div className="text-[10px] uppercase tracking-[0.1em] text-muted">
            Your vibe
          </div>
        </div>
      </div>

      {/* Emotion breakdown */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {emotions.map((emotion) => (
          <div
            key={emotion.label}
            className="rounded-2xl border border-line bg-parchment p-3 text-center"
          >
            <div className="text-xl">{emotion.emoji}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted">
              {emotion.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">
              {emotion.score.toFixed(0)}%
            </div>
          </div>
        ))}
      </div>

      {/* Rolling average insight */}
      <div className="mt-4 rounded-2xl bg-sage/10 p-3">
        <p className="text-xs leading-relaxed text-ink">
          <span className="font-semibold">Pattern detected:</span>{' '}
          {generateInsight(emotions)}
        </p>
      </div>
    </div>
  );
}

function analyzeEmotions(dreams: DreamLike[], summaries: NightlySleepSummary[]): EmotionCategory[] {
  const emotionMap = new Map<string, { count: number; valenceSum: number }>();
  
  // Extract emotions from dreams
  dreams.forEach(dream => {
    const emotion = dream.emotion?.toLowerCase() || dream.context?.mood?.toLowerCase() || '';
    if (emotion) {
      const category = categorizeEmotion(emotion);
      const existing = emotionMap.get(category.label) || { count: 0, valenceSum: 0 };
      emotionMap.set(category.label, {
        count: existing.count + 1,
        valenceSum: existing.valenceSum + category.valence,
      });
    }
  });

  // Extract mood from sleep summaries
  summaries.forEach(summary => {
    if (summary.moodValence !== undefined) {
      const category = valenceToCategory(summary.moodValence);
      const existing = emotionMap.get(category.label) || { count: 0, valenceSum: 0 };
      emotionMap.set(category.label, {
        count: existing.count + 1,
        valenceSum: existing.valenceSum + category.valence,
      });
    }
  });

  // Convert to array and calculate scores
  const emotions: EmotionCategory[] = Array.from(emotionMap.entries()).map(([label, data]) => ({
    label,
    emoji: getEmojiForLabel(label),
    score: Math.min(100, Math.round((data.count / Math.max(dreams.length, summaries.length, 1)) * 100)),
    count: data.count,
  }));

  // Ensure we have at least some default categories
  const defaultCategories: EmotionCategory[] = [
    { label: 'Joy', emoji: '😊', score: 0, count: 0 },
    { label: 'Calm', emoji: '😌', score: 0, count: 0 },
    { label: 'Adventure', emoji: '🗺️', score: 0, count: 0 },
    { label: 'Mystery', emoji: '🔮', score: 0, count: 0 },
    { label: 'Fear', emoji: '😰', score: 0, count: 0 },
    { label: 'Sadness', emoji: '😢', score: 0, count: 0 },
  ];

  // Merge with defaults
  const merged = defaultCategories.map(def => {
    const found = emotions.find(e => e.label === def.label);
    return found || def;
  });

  return merged.sort((a, b) => b.score - a.score).slice(0, 6);
}

function categorizeEmotion(emotion: string): { label: string; valence: number } {
  if (/(joy|happy|excited|love|peace)/.test(emotion)) return { label: 'Joy', valence: 4 };
  if (/(calm|relaxed|serene|tranquil)/.test(emotion)) return { label: 'Calm', valence: 3 };
  if (/(adventure|curious|explore|journey)/.test(emotion)) return { label: 'Adventure', valence: 2 };
  if (/(mystery|strange|weird|unknown|puzzle)/.test(emotion)) return { label: 'Mystery', valence: 1 };
  if (/(fear|nightmare|anxious|scared|panic)/.test(emotion)) return { label: 'Fear', valence: -3 };
  if (/(sad|loss|grief|tear|melancholy)/.test(emotion)) return { label: 'Sadness', valence: -2 };
  return { label: 'Mystery', valence: 0 };
}

function valenceToCategory(valence: number): { label: string; valence: number } {
  if (valence > 2) return { label: 'Joy', valence: 4 };
  if (valence > 0) return { label: 'Calm', valence: 3 };
  if (valence === 0) return { label: 'Mystery', valence: 1 };
  if (valence < -2) return { label: 'Fear', valence: -3 };
  return { label: 'Sadness', valence: -2 };
}

function getEmojiForLabel(label: string): string {
  const map: Record<string, string> = {
    Joy: '😊',
    Calm: '😌',
    Adventure: '🗺️',
    Mystery: '🔮',
    Fear: '😰',
    Sadness: '😢',
  };
  return map[label] || '🎭';
}

function getDominantEmoji(emotions: EmotionCategory[]): string {
  const sorted = [...emotions].sort((a, b) => b.score - a.score);
  return sorted[0]?.emoji || '😴';
}

function generateInsight(emotions: EmotionCategory[]): string {
  const sorted = [...emotions].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const second = sorted[1];

  if (!top || top.score < 10) {
    return 'Keep logging dreams to discover your emotional patterns.';
  }

  if (top.label === 'Joy') {
    return `Your dreams lean positive! ${top.emoji} This often correlates with better REM sleep quality.`;
  }
  if (top.label === 'Calm') {
    return `You're experiencing peaceful dreams. ${top.emoji} Great sign of sleep restoration.`;
  }
  if (top.label === 'Adventure') {
    return `Your subconscious is exploring! ${top.emoji} Active dreaming phase detected.`;
  }
  if (top.label === 'Fear' || top.label === 'Sadness') {
    return `Notice this pattern: ${top.emoji} Consider wind-down routines before bed.`;
  }
  if (second && Math.abs(top.score - second.score) < 15) {
    return `Balanced emotional range between ${top.emoji} and ${second.emoji}. Healthy dream diversity!`;
  }

  return `${top.label}-themed dreams dominate lately. ${top.emoji}`;
}
