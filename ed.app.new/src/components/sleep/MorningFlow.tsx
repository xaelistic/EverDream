import { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Mic,
  Camera,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';
import { EmojiWheel, MOOD_WHEEL_6, type MoodOption } from '../mood/EmojiWheel';
import { addMoodEntry, type MoodEntry } from '../mood/EmojiWheel';
import { getABTestVariant, trackABTestConversion, trackEvent } from '../../lib/analytics';

interface MorningFlowProps {
  onClose: () => void;
  onDreamCapture: () => void;
  onMoodOnly: (mood: string, intensity: number) => void;
  wakeTime: string;
  quote: { text: string; source: string };
}

type MorningVariant = 'mood_first' | 'dream_first' | 'quote_first';

/**
 * Morning notification flow with A/B testing
 * 
 * Three variants:
 * - mood_first: "How did you sleep?" → mood wheel → dream prompt
 * - dream_first: "I dreamed a dream" → capture → mood check
 * - quote_first: Inspirational quote → mood → dream prompt
 */
export function MorningFlow({
  onClose,
  onDreamCapture,
  onMoodOnly,
  wakeTime,
  quote,
}: MorningFlowProps) {
  const [step, setStep] = useState<'greeting' | 'mood' | 'dream_prompt' | 'complete'>('greeting');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [variant, setVariant] = useState<MorningVariant>('mood_first');

  // Determine A/B test variant on mount
  useEffect(() => {
    const abVariant = getABTestVariant('morning_flow_v1');
    if (abVariant) {
      setVariant(abVariant.config.variant as MorningVariant);
    } else {
      // Create the A/B test if it doesn't exist
      const { createABTest } = require('../../lib/analytics');
      createABTest({
        id: 'morning_flow_v1',
        name: 'Morning Flow Variant',
        description: 'Tests whether mood-first, dream-first, or quote-first drives more engagement',
        targetEvent: 'morning_flow_complete',
        active: true,
        audiencePercentage: 100,
        variants: [
          { id: 'mood_first', name: 'Mood First', weight: 33, config: { variant: 'mood_first' } },
          { id: 'dream_first', name: 'Dream First', weight: 33, config: { variant: 'dream_first' } },
          { id: 'quote_first', name: 'Quote First', weight: 34, config: { variant: 'quote_first' } },
        ],
      });
      // Re-fetch variant
      const v = getABTestVariant('morning_flow_v1');
      if (v) setVariant(v.config.variant as MorningVariant);
    }

    trackEvent('screen_view', 'morning_flow_start', { variant });
  }, []);

  // Set initial step based on variant
  useEffect(() => {
    switch (variant) {
      case 'mood_first':
        setStep('mood');
        break;
      case 'dream_first':
        setStep('dream_prompt');
        break;
      case 'quote_first':
        setStep('greeting');
        break;
    }
  }, [variant]);

  const handleMoodSelect = (moodId: string, newIntensity: number) => {
    setSelectedMood(moodId);
    setIntensity(newIntensity);
  };

  const handleMoodSubmit = () => {
    if (!selectedMood) return;

    const entry: Omit<MoodEntry, 'id'> = {
      moodId: selectedMood,
      intensity,
      timestamp: Date.now(),
      context: 'morning',
    };
    addMoodEntry(entry);
    trackEvent('custom', 'mood_logged', { mood: selectedMood, intensity });

    onMoodOnly(selectedMood, intensity);

    // After mood, prompt for dream
    setStep('dream_prompt');
  };

  const handleDreamCapture = () => {
    trackABTestConversion('morning_flow_v1');
    trackEvent('custom', 'morning_dream_capture_started', { variant });
    onDreamCapture();
  };

  const handleSkip = () => {
    trackABTestConversion('morning_flow_v1');
    trackEvent('screen_view', 'morning_flow_complete', { variant, skipped: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-gradient-to-b from-amber-50 via-orange-50 to-rose-50 flex flex-col">
      {/* Close button */}
      <div className="shrink-0 px-4 py-3 flex justify-end">
        <button type="button" onClick={handleSkip} className="p-2 rounded-full hover:bg-black/5 transition">
          <X className="w-5 h-5 text-muted" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Greeting step (quote_first variant) */}
        {step === 'greeting' && (
          <div className="max-w-sm mx-auto space-y-6 text-center">
            <div className="space-y-3">
              <Sun className="w-12 h-12 text-amber-500 mx-auto" strokeWidth={1.2} />
              <h1 className="text-2xl font-serif text-ink">
                Good Morning
              </h1>
              <p className="text-sm text-muted">
                You woke at {wakeTime}
              </p>
            </div>

            {/* Quote card */}
            <div className="rounded-2xl bg-white/80 border border-line p-5 shadow-paper">
              <p className="text-base font-serif text-ink italic leading-relaxed">
                "{quote.text}"
              </p>
              <p className="text-xs text-muted mt-3">— {quote.source}</p>
            </div>

            <button
              type="button"
              onClick={() => setStep('mood')}
              className="w-full bg-sage hover:bg-sageDark text-white font-semibold py-3.5 rounded-2xl transition text-sm flex items-center justify-center gap-2"
            >
              How are you feeling?
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Mood step */}
        {step === 'mood' && (
          <div className="max-w-sm mx-auto space-y-5">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-serif text-ink">
                {variant === 'dream_first' ? 'Before you go...' : 'How did you sleep?'}
              </h2>
              <p className="text-sm text-muted">
                {variant === 'dream_first'
                  ? 'Quick mood check-in'
                  : 'Tap an emoji, pinch to adjust intensity'}
              </p>
            </div>

            <EmojiWheel
              options={MOOD_WHEEL_6}
              value={selectedMood}
              intensity={intensity}
              onChange={handleMoodSelect}
              size="md"
              showLabels={true}
            />

            {selectedMood && (
              <button
                type="button"
                onClick={handleMoodSubmit}
                className="w-full bg-sage hover:bg-sageDark text-white font-semibold py-3.5 rounded-2xl transition text-sm"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {/* Dream prompt step */}
        {step === 'dream_prompt' && (
          <div className="max-w-sm mx-auto space-y-5 text-center">
            <div className="space-y-3">
              <Moon className="w-12 h-12 text-duskDeep mx-auto" strokeWidth={1.2} />
              <h2 className="text-xl font-serif text-ink">
                {variant === 'dream_first' ? 'Tell me your dream' : 'Any dreams to share?'}
              </h2>
              <p className="text-sm text-muted">
                {variant === 'dream_first'
                  ? 'Capture your dream before it fades'
                  : 'Recording your dreams helps you remember them better'}
              </p>
            </div>

            {/* Dream capture options */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDreamCapture}
                className="w-full bg-sage hover:bg-sageDark text-white font-semibold py-4 rounded-2xl transition flex items-center justify-center gap-3"
              >
                <Mic className="w-5 h-5" strokeWidth={1.5} />
                Record Dream
              </button>

              <button
                type="button"
                onClick={handleDreamCapture}
                className="w-full border border-line bg-white hover:bg-parchment text-ink font-semibold py-4 rounded-2xl transition flex items-center justify-center gap-3"
              >
                <Camera className="w-5 h-5" strokeWidth={1.5} />
                Video Capture
              </button>

              <button
                type="button"
                onClick={handleDreamCapture}
                className="w-full border border-line bg-white hover:bg-parchment text-ink font-semibold py-4 rounded-2xl transition flex items-center justify-center gap-3"
              >
                <Sparkles className="w-5 h-5" strokeWidth={1.5} />
                Type Dream
              </button>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-muted hover:text-ink transition"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MorningFlow;
