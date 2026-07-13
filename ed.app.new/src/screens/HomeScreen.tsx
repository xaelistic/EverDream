import { Moon, Sparkles, BookOpen, ChevronRight, BedDouble, PenLine, Check } from 'lucide-react';
import { coerceNarrativeText } from '../lib/normalizeDreamAnalysis';
import { ENERGY_LEVELS, type EnergyLevel } from '../lib/dailyCheckin';
import type { WearableSleepRecord } from '../lib/wearables';
import type { DailyQuote } from '../lib/dailyContent';
import type { EducationModule } from '../lib/sleepEducation';

interface Dream {
  id: string;
  date: string;
  content: string;
  category: string;
  emotion: string;
  nugget: string;
  narrative?: string;
  generatedImage?: { url: string } | null;
  assetMetadata?: { rarityScore: number };
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
  lastDream: Dream | null;
  reflectionQuote: DailyQuote;
  reflectionMood: string;
  setReflectionMood: (mood: string) => void;
  reflectionEnergyLevel: EnergyLevel | '';
  onReflectionEnergyLevel: (level: EnergyLevel, value: number) => void;
  checkInSaved: boolean;
  reflectionSleepData: WearableSleepRecord | null;
  dailyEducation: EducationModule;
  getCategoryBadgeClass: (category: string) => string;
  getEmotionEmoji: (emotion: string) => string;
}

export function HomeScreen({
  navigate,
  insights,
  filteredDreams,
  lastDream,
  reflectionQuote,
  reflectionMood,
  setReflectionMood,
  reflectionEnergyLevel,
  onReflectionEnergyLevel,
  checkInSaved,
  reflectionSleepData,
  dailyEducation,
  getEmotionEmoji,
}: HomeScreenProps) {
  const formatSleepDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-5">
      {/* ── Daily reflection (top) ── */}
      <section className="rounded-3xl border border-line bg-gradient-to-br from-parchment via-cream to-moon/20 p-5 shadow-lift relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-dusk/10 blur-2xl pointer-events-none" />
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted mb-2">Daily reflection</p>
        <blockquote className="font-serif text-xl sm:text-2xl leading-snug text-ink">
          &ldquo;{reflectionQuote.text}&rdquo;
        </blockquote>
        <p className="text-sm text-muted mt-3">— {reflectionQuote.source}</p>
        <p className="text-sm text-ink/75 mt-4 leading-relaxed italic">{reflectionQuote.prompt}</p>

        <button
          type="button"
          onClick={() => navigate('record')}
          className="mt-5 w-full bg-sage hover:bg-sageDark text-cream font-semibold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 text-sm shadow-paper"
        >
          <PenLine className="w-4 h-4" strokeWidth={2} />
          Journal about this
        </button>
      </section>

      {/* ── Last night + last dream ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
          <div className="flex items-center gap-2 mb-3">
            <BedDouble className="w-4 h-4 text-duskDeep" strokeWidth={1.75} />
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Last night&apos;s sleep</p>
          </div>
          {reflectionSleepData ? (
            <>
              <p className="text-2xl font-semibold text-ink">
                {formatSleepDuration(reflectionSleepData.sleepDuration || 0)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                <span>{reflectionSleepData.estimatedREM || 0}m REM</span>
                <span>·</span>
                <span>{reflectionSleepData.quality || reflectionSleepData.sleepQuality || 0}% quality</span>
                {reflectionSleepData.source && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{reflectionSleepData.source}</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate('tracker')}
                className="mt-3 text-xs font-semibold text-sageDark inline-flex items-center gap-1"
              >
                Sleep details <ChevronRight className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted leading-relaxed">No sleep data yet.</p>
              <button
                type="button"
                onClick={() => navigate('tracker')}
                className="mt-2 text-xs font-semibold text-sageDark"
              >
                Open sleep tracker →
              </button>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-4 h-4 text-duskDeep" strokeWidth={1.75} />
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Last dream</p>
          </div>
          {lastDream ? (
            <button
              type="button"
              onClick={() => navigate('dream', lastDream.id)}
              className="w-full text-left group"
            >
              {lastDream.generatedImage?.url && (
                <img
                  src={lastDream.generatedImage.url}
                  alt=""
                  className="w-full h-20 object-cover rounded-xl mb-2"
                />
              )}
              <p className="text-sm text-ink line-clamp-2 leading-relaxed group-hover:text-sageDark transition">
                {lastDream.nugget || coerceNarrativeText(lastDream.narrative, lastDream.content) || lastDream.content}
              </p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <span>{getEmotionEmoji(lastDream.emotion)}</span>
                <span>{formatDreamDate(lastDream.date)}</span>
              </p>
            </button>
          ) : (
            <>
              <p className="text-sm text-muted">Nothing captured yet.</p>
              <button
                type="button"
                onClick={() => navigate('record')}
                className="mt-2 text-xs font-semibold text-sageDark"
              >
                Record a dream →
              </button>
            </>
          )}
        </div>
      </section>

      {/* ── Mood & energy check-in ── */}
      <section className="rounded-2xl border border-line bg-parchment p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">How are you feeling?</p>
          {checkInSaved && (reflectionMood || reflectionEnergyLevel) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sageDark">
              <Check className="w-3.5 h-3.5" />
              Saved today
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap mb-5">
          {['peaceful', 'anxious', 'excited', 'tired', 'curious', 'reflective'].map((mood) => {
            const emojis: Record<string, string> = {
              peaceful: '😌', anxious: '😰', excited: '🤩',
              tired: '😴', curious: '🤔', reflective: '✨',
            };
            const isSelected = reflectionMood === mood;
            return (
              <button
                key={mood}
                type="button"
                onClick={() => setReflectionMood(mood)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  isSelected ? 'bg-sage shadow-md scale-110 ring-2 ring-sage/30' : 'bg-white hover:bg-cream'
                }`}
                title={mood}
                aria-pressed={isSelected}
              >
                <span className="text-xl">{emojis[mood]}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">Energy today</p>
        <div className="grid grid-cols-3 gap-2">
          {ENERGY_LEVELS.map((level) => {
            const isSelected = reflectionEnergyLevel === level.id;
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => onReflectionEnergyLevel(level.id, level.value)}
                className={`rounded-2xl border p-3 text-center transition-all ${
                  isSelected
                    ? 'border-sage bg-sage/10 ring-2 ring-sage/25 shadow-paper scale-[1.02]'
                    : 'border-line bg-cream hover:border-sage/30 hover:bg-parchment/80'
                }`}
                aria-pressed={isSelected}
              >
                <span className="text-4xl leading-none block mb-2" aria-hidden>
                  {level.emoji}
                </span>
                <span className="block text-sm font-semibold text-ink">{level.label}</span>
                <span className="block text-[11px] text-muted mt-0.5 leading-snug">{level.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Sleep education snippet ── */}
      <section className="rounded-2xl border border-line bg-parchment/80 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0" aria-hidden>{dailyEducation.icon}</span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">Sleep & wellness</p>
            <h3 className="font-semibold text-ink text-sm">{dailyEducation.title}</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed line-clamp-2">{dailyEducation.content}</p>
            <button
              type="button"
              onClick={() => navigate('tracker')}
              className="mt-2 text-xs font-semibold text-sageDark inline-flex items-center gap-1"
            >
              Learn more in Tracker <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Quick capture + streak ── */}
      <section className="rounded-2xl border border-line bg-cream p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-2xl font-serif font-semibold text-ink">{insights?.currentStreak || 0}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted">day streak</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('record')}
          className="flex-1 max-w-[200px] bg-sage/10 hover:bg-sage/20 border border-sage/30 text-sageDark font-semibold py-2.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2"
        >
          <Moon className="w-4 h-4" />
          Capture dream
        </button>
        <button
          type="button"
          onClick={() => navigate('journal')}
          className="p-2.5 rounded-xl border border-line hover:bg-parchment transition"
          aria-label="Open journal"
        >
          <BookOpen className="w-5 h-5 text-muted" />
        </button>
      </section>

      {/* ── Recent entries ── */}
      {filteredDreams.length > 0 && (
        <section>
          <h3 className="font-serif text-lg font-medium text-ink mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-dusk" strokeWidth={1.5} />
            Recent in your journal
          </h3>
          <div className="space-y-2">
            {filteredDreams.slice(0, 3).map((dream) => (
              <button
                key={dream.id}
                type="button"
                onClick={() => navigate('dream', dream.id)}
                className="w-full text-left rounded-2xl border border-line bg-parchment/60 hover:bg-parchment p-3 transition"
              >
                <p className="text-[10px] uppercase tracking-wider text-muted mb-0.5">
                  {formatDreamDate(dream.date)}
                </p>
                <p className="text-sm text-ink line-clamp-1">{dream.nugget || dream.content}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatDreamDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}