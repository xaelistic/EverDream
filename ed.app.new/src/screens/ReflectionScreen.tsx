import { ArrowLeft, Moon, Sparkles } from 'lucide-react';
import type { WearableSleepRecord } from '../../lib/wearables';

interface ReflectionScreenProps {
  navigate: (screen: string, dreamId?: string) => void;
  reflectionSleepData: WearableSleepRecord | null;
  reflectionQuote: { text: string; source: string };
  reflectionMood: string;
  setReflectionMood: (mood: string) => void;
  reflectionEnergy: number;
  setReflectionEnergy: (energy: number) => void;
}

export function ReflectionScreen({
  navigate,
  reflectionSleepData,
  reflectionQuote,
  reflectionMood,
  setReflectionMood,
  reflectionEnergy,
  setReflectionEnergy,
}: ReflectionScreenProps) {
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('home')}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Home
      </button>

      <div className="rounded-3xl border border-line bg-cream p-6 shadow-lift">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted mb-2">Morning reflection</p>
        <h2 className="font-serif text-2xl font-medium text-ink mb-3">A deeper moment for reflection.</h2>
        <p className="text-sm text-muted mb-6 max-w-xl">Take your time to review your rest, connect with how you're feeling, and capture any dreams that surfaced overnight.</p>

        {/* Daily Quote */}
        <div className="rounded-2xl border border-line bg-parchment p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-dusk" strokeWidth={1.5} />
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Quote of the day</p>
          </div>
          <p className="text-lg font-serif leading-relaxed text-ink">"{reflectionQuote.text}"</p>
          <p className="text-sm text-muted mt-3">— {reflectionQuote.source}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-line bg-parchment p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Sleep summary</p>
              <span className="text-[11px] text-muted uppercase tracking-[0.18em]">{reflectionSleepData?.source ?? 'No sync'}</span>
            </div>
            {reflectionSleepData ? (
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
            ) : (
              <p className="text-sm text-muted">No wearable data found yet. You can still reflect and capture what you remember this morning.</p>
            )}
          </div>

          <div className="rounded-3xl border border-line bg-parchment p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">How are you feeling?</p>
            
            {/* Compact Mood Selector (same as HomeScreen) */}
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
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('record')}
            className="w-full bg-sage hover:bg-sageDark text-cream rounded-2xl py-3.5 font-semibold transition"
          >
            Capture last night's dream
          </button>
          <button
            type="button"
            onClick={() => navigate('home')}
            className="w-full border border-line bg-parchment hover:bg-parchment/90 text-ink rounded-2xl py-3.5 font-semibold transition"
          >
            Return home
          </button>
        </div>
      </div>
    </div>
  );
}
