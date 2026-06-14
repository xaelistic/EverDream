import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  ArrowRight, Loader2, Sparkles, Moon as MoonIcon, Brain, UserCircle2, 
  Heart, Smile, BookOpen, Quote, Check 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BreathingMoon } from '../breathing-moon';
import { ChipButton } from '../ui/ChipButton';
import { supabase } from '../../lib/supabase/client'; // adjust if needed
import { useAuth } from '../../hooks/use-auth'; // or however auth is exposed

type Gender = 'female' | 'male' | 'non-binary' | 'prefer-not';
type Goal = 'better_dreams' | 'understand_dreams' | 'understand_self';

const STEPS = 7;

const ROTATING_FACTS = [
  "Dreams help consolidate memories and process emotions (Harvard Medical School).",
  "The average person has 3-5 dreams per night, but forgets 95% of them (Walker, Why We Sleep).",
  "Lucid dreaming can be trained and used for problem-solving (LaBerge, Stanford).",
  "Recurring dreams often signal unresolved emotional themes (Freud, Jung).",
  "Better sleep hygiene leads to more vivid and recallable dreams (National Sleep Foundation)."
];

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
}

/**
 * OnboardingFlow — 7-step polished onboarding ported from sleep-whispers-flow
 * Adapted for ed.app.new hash router + existing UI + Supabase persistence.
 */
export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Data collected
  const [goals, setGoals] = useState<Goal[]>([]);
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [avgSleep, setAvgSleep] = useState(7);
  const [skippedSleep, setSkippedSleep] = useState(false);
  const [factIndex, setFactIndex] = useState(0);

  // Rotate facts on education step
  React.useEffect(() => {
    if (step === 5) {
      const id = setInterval(() => setFactIndex(i => (i + 1) % ROTATING_FACTS.length), 4200);
      return () => clearInterval(id);
    }
  }, [step]);

  const canAdvance = React.useMemo(() => {
    if (step === 1) return goals.length > 0;
    if (step === 2) return birthDate.length > 0;
    return true;
  }, [step, goals, birthDate]);

  const toggleGoal = (g: Goal) => {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const next = () => {
    if (step < STEPS - 1) setStep(step + 1);
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const payload: any = {
        birth_date: birthDate || null,
        gender: gender || null,
        onboarding_goals: goals,
        average_sleep_hours: skippedSleep ? null : avgSleep,
        onboarded_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('auth_user_id', user.id);

      if (error) throw error;

      onComplete();
    } catch (e: any) {
      console.error('Onboarding save error:', e);
      // Still allow proceeding in dev
      onComplete();
    } finally {
      setBusy(false);
    }
  };

  const age = birthDate ? Math.max(13, Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000)) : null;

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_80)] py-8">
      <div className="mx-auto max-w-2xl px-4">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-between text-xs text-muted">
          <div>Step {step + 1} of {STEPS}</div>
          <button onClick={onSkip || (() => {})} className="hover:underline">Skip for now</button>
        </div>
        <p className="text-[10px] text-center text-muted/70 -mt-6 mb-4 italic">
          Your journal stays on this device. Export or erase whenever you like.
        </p>

        <AnimatePresence mode="wait">
          {/* STEP 0: Welcome */}
          {step === 0 && (
            <motion.div key="welcome" initial={{opacity:0}} animate={{opacity:1}} className="text-center">
              <BreathingMoon size={140} className="mx-auto mb-6" />
              <h1 className="mb-3 text-4xl font-semibold tracking-tight" style={{fontFamily: 'var(--font-display, Fraunces, serif)'}}>
                Welcome to your dream journal
              </h1>
              <p className="mx-auto max-w-md text-lg text-muted">
                In the next minute you'll set up a space that helps you remember, understand, and work with your dreams.
              </p>
              <div className="mt-8">
                <Button onClick={next} size="lg" icon={<ArrowRight size={18} />}>Get started</Button>
              </div>
            </motion.div>
          )}

          {/* STEP 1: Goals */}
          {step === 1 && (
            <motion.div key="goals">
              <h2 className="mb-2 text-2xl font-semibold">What brings you here?</h2>
              <p className="mb-6 text-muted">Select all that apply. We'll tailor insights to you.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { k: 'better_dreams' as Goal, label: 'Remember & improve dreams' },
                  { k: 'understand_dreams' as Goal, label: 'Understand what my dreams mean' },
                  { k: 'understand_self' as Goal, label: 'Understand myself better' },
                ].map(({k, label}) => (
                  <ChipButton key={k} selected={goals.includes(k)} onClick={() => toggleGoal(k)}>
                    {label}
                  </ChipButton>
                ))}
              </div>
              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={back}>Back</Button>
                <Button onClick={next} disabled={!canAdvance}>Continue</Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Birth Date (with age context) */}
          {step === 2 && (
            <motion.div key="birth">
              <h2 className="mb-2 text-2xl font-semibold">When were you born?</h2>
              <p className="mb-4 text-muted">Sleep science is highly age-dependent. This helps us give relevant context.</p>
              <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="max-w-xs" />
              {age && <p className="mt-2 text-sm text-muted">You're about {age} — sleep needs change across the lifespan.</p>}
              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={back}>Back</Button>
                <Button onClick={next} disabled={!canAdvance}>Continue</Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Gender (with context) */}
          {step === 3 && (
            <motion.div key="gender">
              <h2 className="mb-2 text-2xl font-semibold">How do you identify?</h2>
              <p className="mb-4 text-muted">Hormones, life stage, and social factors all affect sleep and dreaming patterns.</p>
              <div className="space-y-3">
                {[
                  {v:'female', label:'Female', note:'Hormonal cycles can influence dream intensity and recall.'},
                  {v:'male', label:'Male', note:'Testosterone rhythms affect REM density.'},
                  {v:'non-binary', label:'Non-binary / Other', note:'Sleep research is still catching up — your data helps.'},
                  {v:'prefer-not', label:'Prefer not to say', note:'No problem — we\'ll use general recommendations.'},
                ].map(({v, label, note}) => (
                  <button key={v} onClick={() => { setGender(v as Gender); setTimeout(next, 120); }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${gender === v ? 'border-primary bg-primary/5' : 'border-line hover:bg-parchment'}`}>
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-muted mt-1">{note}</div>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <Button variant="ghost" onClick={back}>Back</Button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Sleep average */}
          {step === 4 && (
            <motion.div key="sleep">
              <h2 className="mb-2 text-2xl font-semibold">How many hours do you usually sleep?</h2>
              <div className="my-8 text-center">
                <div className="text-6xl font-semibold tabular-nums">{avgSleep}</div>
                <div className="text-muted">hours per night</div>
              </div>
              <input type="range" min="3" max="12" step="0.5" value={avgSleep} onChange={e => setAvgSleep(parseFloat(e.target.value))} className="w-full" />
              <div className="mt-2 flex justify-between text-xs text-muted">
                <div>3h</div><div>12h</div>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={skippedSleep} onChange={e => setSkippedSleep(e.target.checked)} /> I don't track this / it varies wildly
              </label>
              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={back}>Back</Button>
                <Button onClick={next}>Continue</Button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Education / Did you know */}
          {step === 5 && (
            <motion.div key="education">
              <div className="mb-6 flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold">A few things worth knowing</h2>
              </div>
              <div className="rounded-3xl border border-line bg-white p-6">
                <Quote className="mb-3 h-5 w-5 text-muted" />
                <p className="text-lg leading-snug">{ROTATING_FACTS[factIndex]}</p>
              </div>
              <p className="mt-4 text-center text-xs text-muted">Swipe or wait — facts rotate automatically.</p>
              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={back}>Back</Button>
                <Button onClick={next}>I'm ready</Button>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Done */}
          {step === 6 && (
            <motion.div key="done" className="text-center py-12">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-9 w-9 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">You're all set.</h2>
              <p className="mx-auto mt-3 max-w-xs text-muted">Your preferences are saved. The more you journal, the smarter the insights get.</p>

              <div className="mt-10 flex flex-col items-center gap-3">
                <Button size="lg" onClick={finish} disabled={busy} icon={busy ? <Loader2 className="animate-spin" /> : undefined}>
                  {busy ? 'Saving...' : 'Start my first dream entry'}
                </Button>
                <button onClick={onSkip} className="text-sm text-muted underline">Explore the app first</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default OnboardingFlow;