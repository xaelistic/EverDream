/**
 * OnboardingFlow — post-registration setup
 *
 * Research-backed: short, goal-first, privacy line, optional demographics,
 * ends with first dream CTA. Saves real profile fields only.
 */

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Loader2,
  BookOpen,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BreathingMoon } from '../breathing-moon';
import { ChipButton } from '../ui/ChipButton';
import { useAuth } from '../../hooks/use-auth';
import {
  ONBOARDING_GOALS,
  ONBOARDING_INTERESTS,
  EXPERIENCE_OPTIONS,
  RECALL_OPTIONS,
  emptyOnboardingAnswers,
  focusPreviewLines,
  buildProfilePayload,
  type OnboardingGoalId,
  type InterestId,
  type ExperienceLevel,
  type DreamRecallLevel,
  type OnboardingAnswers,
} from '../../lib/onboarding/model';
import { saveOnboardingToProfile } from '../../lib/onboarding/saveOnboarding';

const STEPS = 7;

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => {
    const base = emptyOnboardingAnswers();
    if (user?.email) {
      const local = user.email.split('@')[0] || '';
      base.displayName = local.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return base;
  });

  const canAdvance = useMemo(() => {
    if (step === 1) return answers.goals.length > 0;
    if (step === 3) return Boolean(answers.experienceLevel && answers.dreamRecall);
    return true;
  }, [step, answers.goals.length, answers.experienceLevel, answers.dreamRecall]);

  const preview = useMemo(
    () => focusPreviewLines(answers.goals, answers.interests),
    [answers.goals, answers.interests],
  );

  const patch = (partial: Partial<OnboardingAnswers>) =>
    setAnswers((prev) => ({ ...prev, ...partial }));

  const toggleGoal = (id: OnboardingGoalId) => {
    setAnswers((prev) => ({
      ...prev,
      goals: prev.goals.includes(id)
        ? prev.goals.filter((g) => g !== id)
        : [...prev.goals, id],
    }));
  };

  const toggleInterest = (id: InterestId) => {
    setAnswers((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((g) => g !== id)
        : [...prev.interests, id],
    }));
  };

  const next = () => {
    if (step < STEPS - 1) setStep((s) => s + 1);
  };
  const back = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const persist = async (markComplete: boolean) => {
    if (!user) {
      onComplete();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = buildProfilePayload(answers);
      if (!markComplete) {
        // Skip still closes the loop so we don't trap the user
        payload.onboarded_at = new Date().toISOString();
      }
      await saveOnboardingToProfile(user.id, payload);
      onComplete();
    } catch (e: unknown) {
      console.error('Onboarding save error:', e);
      setError(e instanceof Error ? e.message : 'Could not save profile. You can continue and finish later.');
      // Still allow exit — local cache may have saved
      onComplete();
    } finally {
      setBusy(false);
    }
  };

  const finish = () => void persist(true);
  const skip = () => {
    if (onSkip) onSkip();
    void persist(false);
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[oklch(0.98_0.005_80)]">
      <div className="mx-auto min-h-full max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between text-xs text-muted">
          <div>
            Step {step + 1} of {STEPS}
          </div>
          <button type="button" onClick={skip} className="hover:underline" disabled={busy}>
            Skip for now
          </button>
        </div>

        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-line/60">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS) * 100}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <BreathingMoon size={120} className="mx-auto mb-6" />
              <h1
                className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl"
                style={{ fontFamily: 'var(--font-display, Fraunces, serif)' }}
              >
                Welcome to EverDream
              </h1>
              <p className="mx-auto max-w-md text-base text-muted sm:text-lg">
                A private space to capture dreams, spot patterns, and grow the habits that improve
                recall and rest.
              </p>
              <p className="mx-auto mt-4 max-w-sm text-xs text-muted/80">
                Your journal stays under your control. Export or erase whenever you like. We’ll only
                use what you share here to personalise tips — never fill your profile with fake data.
              </p>
              <div className="mt-6 max-w-sm mx-auto text-left">
                <label className="mb-1 block text-sm font-medium text-ink">What should we call you?</label>
                <Input
                  value={answers.displayName}
                  onChange={(e) => patch({ displayName: e.target.value })}
                  placeholder="Display name"
                  autoComplete="nickname"
                />
              </div>
              <div className="mt-8">
                <Button onClick={next} size="lg" icon={<ArrowRight size={18} />}>
                  Personalise my journal
                </Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="goals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="mb-2 text-2xl font-semibold">What brings you here?</h2>
              <p className="mb-6 text-muted">
                Pick at least one. We’ll prioritise education and prompts around these.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ONBOARDING_GOALS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGoal(g.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      answers.goals.includes(g.id)
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-line hover:bg-parchment/60'
                    }`}
                  >
                    <div className="font-medium text-ink">{g.label}</div>
                    <div className="mt-1 text-xs text-muted">{g.blurb}</div>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button onClick={next} disabled={!canAdvance}>
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="interests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="mb-2 text-2xl font-semibold">Any topics you’re curious about?</h2>
              <p className="mb-6 text-muted">Optional. Empty is fine — you can add these later in Profile.</p>
              <div className="flex flex-wrap gap-2">
                {ONBOARDING_INTERESTS.map((i) => (
                  <ChipButton
                    key={i.id}
                    selected={answers.interests.includes(i.id)}
                    onClick={() => toggleInterest(i.id)}
                  >
                    {i.label}
                  </ChipButton>
                ))}
              </div>
              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button onClick={next}>Continue</Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="experience" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="mb-2 text-2xl font-semibold">Where are you starting from?</h2>
              <p className="mb-4 text-muted">So we don’t over- or under-explain.</p>
              <div className="space-y-3 mb-8">
                {EXPERIENCE_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => patch({ experienceLevel: o.id as ExperienceLevel })}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      answers.experienceLevel === o.id
                        ? 'border-primary bg-primary/5'
                        : 'border-line hover:bg-parchment/60'
                    }`}
                  >
                    <div className="font-medium">{o.label}</div>
                    <div className="mt-1 text-xs text-muted">{o.note}</div>
                  </button>
                ))}
              </div>
              <h3 className="mb-3 text-lg font-semibold">How often do you remember dreams?</h3>
              <div className="space-y-3">
                {RECALL_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => patch({ dreamRecall: o.id as DreamRecallLevel })}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      answers.dreamRecall === o.id
                        ? 'border-primary bg-primary/5'
                        : 'border-line hover:bg-parchment/60'
                    }`}
                  >
                    <div className="font-medium">{o.label}</div>
                    <div className="mt-1 text-xs text-muted">{o.note}</div>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button onClick={next} disabled={!canAdvance}>
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="sleep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="mb-2 text-2xl font-semibold">Roughly how long do you sleep?</h2>
              <p className="mb-4 text-muted">Optional — helps sleep tips. Skip if it varies wildly.</p>
              {!answers.skippedSleep && (
                <>
                  <div className="my-8 text-center">
                    <div className="text-6xl font-semibold tabular-nums">{answers.averageSleepHours}</div>
                    <div className="text-muted">hours per night</div>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={12}
                    step={0.5}
                    value={answers.averageSleepHours ?? 7}
                    onChange={(e) => patch({ averageSleepHours: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="mt-2 flex justify-between text-xs text-muted">
                    <span>3h</span>
                    <span>12h</span>
                  </div>
                </>
              )}
              <label className="mt-6 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={answers.skippedSleep}
                  onChange={(e) => patch({ skippedSleep: e.target.checked })}
                />
                I don’t track this / it varies a lot
              </label>
              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button onClick={next}>Continue</Button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-6 flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold">What we’ll focus on for you</h2>
              </div>
              <p className="mb-4 text-muted">
                Based on your goals, daily education and tips will lean into these themes. You can change
                interests anytime in Profile.
              </p>
              <ul className="space-y-3">
                {preview.map((line) => (
                  <li
                    key={line}
                    className="flex gap-3 rounded-2xl border border-line bg-white/80 p-4 text-sm leading-relaxed"
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={back}>
                  Back
                </Button>
                <Button onClick={next}>Looks good</Button>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-9 w-9 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">You’re set.</h2>
              <p className="mx-auto mt-3 max-w-sm text-muted">
                Preferences are saved to your profile. The best next step in dream work is the same
                everywhere: capture something from last night — even a fragment.
              </p>
              {error && <p className="mt-4 text-sm text-amber-700">{error}</p>}
              <div className="mt-10 flex flex-col items-center gap-3">
                <Button
                  size="lg"
                  onClick={finish}
                  disabled={busy}
                  icon={busy ? <Loader2 className="animate-spin" /> : <ArrowRight size={18} />}
                >
                  {busy ? 'Saving…' : 'Start my first dream entry'}
                </Button>
                <button type="button" onClick={skip} className="text-sm text-muted underline" disabled={busy}>
                  Explore the app first
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default OnboardingFlow;
