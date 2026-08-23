import { Moon, Sparkles, BookOpen, ChevronRight, BedDouble, PenLine, Check } from 'lucide-react';
import { coerceNarrativeText } from '../lib/normalizeDreamAnalysis';
import { presentDream } from '../lib/dreamClassify';
import { ENERGY_LEVELS, type EnergyLevel } from '../lib/dailyCheckin';
import type { WearableSleepRecord } from '../lib/wearables';
import type { DailyQuote } from '../lib/dailyContent';
import { getDailyQuoteCard } from '../lib/dailyContent';
import type { EducationModule } from '../lib/sleepEducation';
import { SLEEP_CARD_GRADIENTS, educationPalette } from '../lib/sleepEducation';

interface Dream {
  id: string;
  date: string;
  content: string;
  category: string;
  emotion: string;
  nugget: string;
  title?: string;
  narrative?: string;
  moodValence?: number;
  processingStatus?: string;
  capturedEmotions?: { dominantEmotion?: string } | null;
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
  onOpenSleepCard?: (moduleId: string) => void;
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
  setReflectionMood: _setReflectionMood,
  reflectionEnergyLevel,
  onReflectionEnergyLevel,
  checkInSaved,
  reflectionSleepData,
  dailyEducation,
  onOpenSleepCard,
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
      <section className={`rounded-3xl border border-line bg-gradient-to-br ${SLEEP_CARD_GRADIENTS[educationPalette(getDailyQuoteCard())]} p-6 shadow-lift relative overflow-hidden min-h-[220px] text-[#f7f1e8]`}>
        <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.2),_transparent_55%)]" />
        <p className="relative text-[10px] uppercase tracking-[0.28em] text-white/60 mb-4">Night note</p>
        <button
          type="button"
          onClick={() => (onOpenSleepCard ? onOpenSleepCard(getDailyQuoteCard().id) : navigate('education'))}
          className="relative text-left w-full"
        >
          <blockquote className="font-serif text-[1.85rem] sm:text-4xl leading-[1.15] tracking-tight">
            &ldquo;{reflectionQuote.text}&rdquo;
          </blockquote>
          <p className="text-xs tracking-[0.18em] uppercase text-white/70 mt-6">— {reflectionQuote.source}</p>
          <p className="text-sm text-white/85 mt-5 leading-relaxed italic">{reflectionQuote.prompt}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white/90">
            Open full card <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate('record')}
          className="relative mt-5 w-full bg-white/15 hover:bg-white/22 border border-white/20 text-white font-semibold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 text-sm"
        >
          <PenLine className="w-4 h-4" strokeWidth={2} />
          Journal about this
        </button>
      </section>

      {/* ── How are you feeling? (energy check-in) ── */}
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
        <div className="grid grid-cols-3 gap-2">
          {/* Left = Not great, right = Good */}
          {[...ENERGY_LEVELS].reverse().map((level) => {
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
                {presentDream(lastDream).title || lastDream.nugget || coerceNarrativeText(lastDream.narrative, lastDream.content) || lastDream.content}
              </p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <span>{getEmotionEmoji(presentDream(lastDream).emotion)}</span>
                <span>{presentDream(lastDream).emotionName}</span>
                <span>·</span>
                <span>
                  {presentDream(lastDream).when.primary}
                  {presentDream(lastDream).when.secondary ? ` ${presentDream(lastDream).when.secondary}` : ''}
                </span>
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

      {/* ── Sleep education snippet ── */}
      <button
        type="button"
        onClick={() => (onOpenSleepCard ? onOpenSleepCard(dailyEducation.id) : navigate('education'))}
        className={`w-full text-left rounded-3xl border border-line overflow-hidden min-h-[160px] bg-gradient-to-br ${SLEEP_CARD_GRADIENTS[educationPalette(dailyEducation)]} p-6 shadow-lift relative`}
      >
        <p className="text-[10px] uppercase tracking-[0.28em] text-white/60 mb-3">Sleep guide</p>
        <h3 className="font-serif text-2xl sm:text-3xl text-[#f7f1e8] leading-snug">{dailyEducation.title}</h3>
        <p className="text-sm text-white/80 mt-3 leading-relaxed line-clamp-3">{dailyEducation.content}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white">
          Open full card <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </button>

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
                  {presentDream(dream).when.primary}
                  {presentDream(dream).when.secondary ? ` · ${presentDream(dream).when.secondary}` : ''}
                </p>
                <p className="text-sm text-ink line-clamp-1">{presentDream(dream).title || dream.nugget || dream.content}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

