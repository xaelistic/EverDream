import { X, BookOpen, Moon, Sparkles, ChevronRight } from 'lucide-react';
import type { EducationModule } from '../../lib/sleepEducation';
import type { DailyQuote } from '../../lib/dailyContent';

interface LastDreamPreview {
  id: string;
  nugget?: string;
  narrative?: string;
  content?: string;
  emotion?: string;
  generatedImage?: { url: string } | null;
  date: string;
}

interface SleepPreview {
  durationMinutes?: number;
  quality?: number;
  remMinutes?: number;
  source?: string;
}

interface DailyReflectionCardProps {
  quote: DailyQuote;
  education: EducationModule;
  lastDream: LastDreamPreview | null;
  sleep: SleepPreview | null;
  onDismiss: () => void;
  onOpenDream: (dreamId: string) => void;
  onJournalAboutQuote: () => void;
  onGoHome: () => void;
}

export function DailyReflectionCard({
  quote,
  education,
  lastDream,
  sleep,
  onDismiss,
  onOpenDream,
  onJournalAboutQuote,
  onGoHome,
}: DailyReflectionCardProps) {
  const heroImage = lastDream?.generatedImage?.url;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-cream shadow-2xl animate-in"
        role="dialog"
        aria-labelledby="daily-reflection-title"
      >
        {/* Hero visual */}
        <div className="relative h-48 sm:h-56 overflow-hidden rounded-t-3xl sm:rounded-t-3xl">
          {heroImage ? (
            <img src={heroImage} alt="Last dream visualization" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-dusk/30 via-sage/20 to-moon/40 flex items-center justify-center">
              <Moon className="w-16 h-16 text-duskDeep/40" strokeWidth={1} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/20 to-transparent" />
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center"
            aria-label="Close reflection"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">Welcome back</p>
            <h2 id="daily-reflection-title" className="font-serif text-2xl font-medium text-ink">
              Your daily reflection
            </h2>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Quote */}
          <div className="rounded-2xl border border-line bg-parchment p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-dusk" />
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Today&apos;s reflection</p>
            </div>
            <p className="font-serif text-lg leading-relaxed text-ink">&ldquo;{quote.text}&rdquo;</p>
            <p className="text-sm text-muted mt-2">— {quote.source}</p>
            <p className="text-sm text-ink/80 mt-3 italic">{quote.prompt}</p>
          </div>

          {/* Sleep + last dream row */}
          <div className="grid grid-cols-2 gap-3">
            {sleep && (sleep.durationMinutes || sleep.quality) ? (
              <div className="rounded-2xl border border-line bg-white/80 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Last night</p>
                <p className="text-xl font-semibold text-ink">
                  {sleep.durationMinutes
                    ? `${Math.floor(sleep.durationMinutes / 60)}h ${sleep.durationMinutes % 60}m`
                    : '—'}
                </p>
                {sleep.quality != null && (
                  <p className="text-xs text-muted mt-1">{sleep.quality}% quality</p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-line bg-parchment/50 p-3 flex items-center justify-center text-center">
                <p className="text-xs text-muted">Sync a wearable for sleep data</p>
              </div>
            )}

            {lastDream ? (
              <button
                type="button"
                onClick={() => onOpenDream(lastDream.id)}
                className="rounded-2xl border border-sage/30 bg-sage/5 p-3 text-left hover:bg-sage/10 transition"
              >
                <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Last dream</p>
                <p className="text-sm text-ink line-clamp-2 leading-snug">
                  {lastDream.nugget || lastDream.content?.slice(0, 80)}
                </p>
                <span className="text-xs text-sageDark mt-1 inline-flex items-center gap-1">
                  Read <ChevronRight className="w-3 h-3" />
                </span>
              </button>
            ) : (
              <div className="rounded-2xl border border-dashed border-line bg-parchment/50 p-3 flex items-center justify-center text-center">
                <p className="text-xs text-muted">No dreams logged yet</p>
              </div>
            )}
          </div>

          {/* Educational content */}
          <div className="rounded-2xl border border-line bg-parchment p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden>{education.icon}</span>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted mb-1">
                  Sleep insight · {education.readTimeMinutes} min read
                </p>
                <h3 className="font-semibold text-ink">{education.title}</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed line-clamp-3">{education.content}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pb-2">
            <button
              type="button"
              onClick={onJournalAboutQuote}
              className="w-full bg-sage hover:bg-sageDark text-cream font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition"
            >
              <BookOpen className="w-5 h-5" />
              Journal about today&apos;s reflection
            </button>
            <button
              type="button"
              onClick={onGoHome}
              className="w-full border border-line bg-cream hover:bg-parchment text-ink font-medium py-3 rounded-2xl transition"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}