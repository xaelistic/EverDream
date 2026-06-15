import { Moon, Sparkles, Cpu, Camera, Shield } from 'lucide-react';
import type { WearableSleepRecord } from '../../lib/wearables';

interface Dream {
  id: string;
  date: string;
  content: string;
  category: string;
  emotion: string;
  nugget: string;
  assetMetadata?: {
    rarityScore: number;
  };
  isSample?: boolean;
}

interface HomeScreenProps {
  navigate: (screen: string, dreamId?: string) => void;
  insights: {
    currentStreak: number;
    totalDreams: number;
    avgRarity: string;
    totalAssetValue: string;
  } | null;
  filteredDreams: Dream[];
  reflectionQuote: { text: string; source: string };
  reflectionMood: string;
  setReflectionMood: (mood: string) => void;
  reflectionEnergy: number;
  setReflectionEnergy: (energy: number) => void;
  reflectionSleepData: WearableSleepRecord | null;
  getCategoryBadgeClass: (category: string) => string;
  getEmotionEmoji: (emotion: string) => string;
}

export function HomeScreen({
  navigate,
  insights,
  filteredDreams,
  reflectionQuote,
  reflectionMood,
  setReflectionMood,
  reflectionEnergy,
  setReflectionEnergy,
  reflectionSleepData,
  getCategoryBadgeClass,
  getEmotionEmoji,
}: HomeScreenProps) {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-3xl border border-line bg-cream p-6 shadow-lift relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-moon/35 blur-2xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted mb-2">Today</p>
            <h2 className="font-serif text-2xl sm:text-[1.65rem] font-medium text-ink leading-tight">
              A quiet moment for <em className="text-duskDeep not-italic">your dreams</em>
            </h2>
          </div>
          <div className="text-right shrink-0 rounded-2xl border border-line bg-parchment px-4 py-3 shadow-paper">
            <div className="text-2xl font-serif font-semibold text-ink">{insights?.currentStreak || 0}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted">day streak</div>
          </div>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate('record')}
            className="relative w-full bg-sage hover:bg-sageDark text-cream font-semibold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-paper text-sm"
          >
            <Moon className="w-5 h-5" strokeWidth={1.75} />
            I had a dream…
          </button>
          <button
            type="button"
            onClick={() => navigate('import-photos')}
            className="relative w-full border border-sage/30 bg-sage/5 hover:bg-sage/10 text-sageDark font-semibold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 text-sm"
          >
            <Camera className="w-5 h-5" strokeWidth={1.75} />
            Import journal photos
          </button>

        </div>
      </div>

      {/* Quick Stats */}
      {insights && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Moon} value={insights.totalDreams} label="Entries" />
          <StatCard icon={Sparkles} value={`${insights.avgRarity}`} label="Avg depth" />
          <StatCard icon={Sparkles} value={`${insights.totalAssetValue}`} label="Glow index" />
        </div>
      )}

      {/* Quote of the Day */}
      <div className="rounded-3xl border border-line bg-parchment p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">Quote of the day</p>
        <p className="text-lg font-serif leading-relaxed text-ink">"{reflectionQuote.text}"</p>
        <p className="text-sm text-muted mt-4">— {reflectionQuote.source}</p>
      </div>

      {/* Mood & Energy Check-in */}
      <div className="rounded-3xl border border-line bg-parchment p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">How are you feeling?</p>
        
        {/* Compact Mood Selector */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
          {['peaceful', 'anxious', 'excited', 'tired', 'curious', 'reflective'].map((mood) => {
            const emojis: Record<string, string> = {
              peaceful: '😌',
              anxious: '😰',
              excited: '🤩',
              tired: '😴',
              curious: '🤔',
              reflective: '✨',
            };
            const isSelected = reflectionMood === mood;
            return (
              <button
                key={mood}
                type="button"
                onClick={() => setReflectionMood(mood)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-sage shadow-md scale-110 ring-2 ring-white/20'
                    : 'bg-white/5 hover:bg-white/10 hover:scale-105'
                }`}
                title={mood}
              >
                <span className="text-xl">{emojis[mood]}</span>
              </button>
            );
          })}
        </div>

        {/* Energy Slider */}
        <div>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted mb-2">
            <span>Energy</span>
            <span>{reflectionEnergy}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={reflectionEnergy}
            onChange={(e) => setReflectionEnergy(Number(e.target.value))}
            className="w-full accent-sage"
          />
        </div>
      </div>

      {/* Sleep Summary (if wearable data available) */}
      {reflectionSleepData && (
        <div className="rounded-3xl border border-line bg-parchment p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Last night's sleep</p>
            <span className="text-[11px] text-muted uppercase tracking-[0.18em]">{reflectionSleepData.source ?? 'No sync'}</span>
          </div>
          <div className="space-y-3 text-sm text-ink">
            <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-muted">Duration</div>
              <div className="text-lg font-semibold">{Math.round((reflectionSleepData.sleepDuration || 0) / 60)}h {Math.round((reflectionSleepData.sleepDuration || 0) % 60)}m</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/90 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-muted">Deep/REM</div>
                <div className="font-semibold">{reflectionSleepData.estimatedREM || 0}m REM</div>
              </div>
              <div className="rounded-2xl bg-white/90 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-muted">Quality</div>
                <div className="font-semibold">{reflectionSleepData.quality || reflectionSleepData.sleepQuality || 0}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gentle capabilities */}
      <div className="rounded-2xl border border-line bg-parchment/70 p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-ink">
          <Cpu className="w-4 h-4 text-sageDark" strokeWidth={1.75} />
          Designed for reflection first
        </h3>
        <ul className="text-sm text-muted space-y-2 leading-relaxed">
          <li>Optional AI interpretation & soft imagery — always yours to disable.</li>
          <li>Wearable-friendly sleep context when you want it.</li>
          <li>Local storage, exports, and GDPR-minded controls.</li>
        </ul>
      </div>

      {/* Recent Dreams */}
      <div>
        <h3 className="font-serif text-lg font-medium text-ink mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-dusk" strokeWidth={1.5} />
          Recent in your journal
        </h3>
        {filteredDreams.length === 0 ? (
          <div className="text-center py-12 text-muted border border-dashed border-line rounded-3xl bg-parchment/40">
            <Moon className="w-14 h-14 mx-auto mb-4 opacity-35 text-duskDeep" strokeWidth={1.25} />
            <p className="text-ink font-medium">Nothing here yet</p>
            <p className="text-sm mt-2 max-w-xs mx-auto leading-relaxed">When you wake with images still vivid, tap Record — even one sentence counts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDreams.slice(0, 3).map(dream => (
              <DreamNuggetCard 
                key={dream.id} 
                dream={dream}
                getCategoryBadgeClass={getCategoryBadgeClass}
                getEmotionEmoji={getEmotionEmoji}
                onClick={() => navigate('dream', dream.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ icon: Icon, value, label }: { icon: any; value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-parchment/70 p-3 text-center">
      <Icon className="w-4 h-4 mx-auto mb-1 text-sageDark" strokeWidth={1.75} />
      <div className="text-lg font-semibold text-ink">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

function DreamNuggetCard({ dream, getCategoryBadgeClass, getEmotionEmoji, onClick }: { 
  dream: Dream; 
  getCategoryBadgeClass: (category: string) => string;
  getEmotionEmoji: (emotion: string) => string;
  onClick: () => void;
}) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-line bg-parchment/60 hover:bg-parchment p-4 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted mb-1">{formatDate(dream.date)}</p>
          <p className="text-sm text-ink line-clamp-2 leading-relaxed">{dream.nugget || dream.content}</p>
        </div>
        <span className="text-lg">{getEmotionEmoji(dream.emotion)}</span>
      </div>
    </button>
  );
}
