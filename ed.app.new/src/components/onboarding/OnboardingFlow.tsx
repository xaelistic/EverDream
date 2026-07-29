/**
 * OnboardingFlow — post-registration setup
 *
 * Research-backed: short, goal-first, privacy line, optional demographics,
 * ends with clear CTAs: first dream vs explore home (not mixed up).
 */

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Loader2,
  BookOpen,
  Check,
  Sparkles,
  PenLine,
  Compass,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BreathingMoon } from '../breathing-moon';
import { ChipButton } from '../ui/ChipButton';
import { useAuth } from '../../hooks/use-auth';
import {
  ONBOARDING_GOALS,
  ONBOARDING_INTERESTS,
  ONBOARDING_OFFERINGS,
  EXPERIENCE_OPTIONS,
  RECALL_OPTIONS,
  emptyOnboardingAnswers,
  focusPreviewLines,
  buildProfilePayload,
  markOnboardedLocally,
  type OnboardingGoalId,
  type InterestId,
  type ExperienceLevel,
  type DreamRecallLevel,
  type OnboardingAnswers,
} from '../../lib/onboarding/model';
import {
  saveOnboardingToProfile,
  loadOnboardingPrefill,
} from '../../lib/onboarding/saveOnboarding';

const STEPS = 7;

export type OnboardingCompleteAction = 'first_dream' | 'explore';

interface OnboardingFlowProps {
  /** Called after save. action drives where the app navigates. */
  onComplete: (result: { action: OnboardingCompleteAction }) => void;
}

/** Shared selected card styles — clear shading for multi/single select. */
function selectCardClass(selected: boolean): string {
  return [
    'rounded-2xl border p-4 text-left transition-all duration-150',
    selected
      ? 'border-sage bg-sage/15 ring-2 ring-sage/35 shadow-md'
      : 'border-line bg-cream/60 hover:bg-parchment/80 hover:border-sage/25',
  ].join(' ');
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefillNote, setPrefillNote] = useState<string | null>(null);
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => {
    const base = emptyOnboardingAnswers();
    if (user?.email) {
      const local = user.email.split('@')[0] || '';
      base.displayName = local.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return base;
  });

  // Prepopulate from existing profile + social (Spotify / Meta) signals
  useEffect(() => {
    let cancelled = false;
    void loadOnboardingPrefill().then((prefill) => {
      if (cancelled) return;
      setAnswers((prev) => {
        const next = { ...prev };
        if (prefill.displayName) next.displayName = prefill.displayName;
        if (prefill.goals.length) next.goals = prefill.goals;
        if (prefill.interests.length) next.interests = prefill.interests;
        if (prefill.experienceLevel) {
          next.experienceLevel = prefill.experienceLevel as ExperienceLevel;
        }
        if (prefill.dreamRecall) {
          next.dreamRecall = prefill.dreamRecall as DreamRecallLevel;
        }
        return next;
      });
      if (prefill.goals.length || prefill.interests.length || prefill.socialInterestLabels.length) {
        const bits: string[] = [];
        if (prefill.goals.length || prefill.interestLabels.length) {
          bits.push('your profile');
        }
        if (prefill.socialInterestLabels.length) {
          bits.push('linked social tastes');
        }
        setPrefillNote(`Pre-filled from ${bits.join(' + ')}. Adjust anything you like.`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const persist = async (action: OnboardingCompleteAction) => {
    const finishClient = () => {
      markOnboardedLocally();
      onComplete({ action });
    };

    if (!user) {
      finishClient();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = buildProfilePayload(answers);
      await saveOnboardingToProfile(user.id, payload);
      finishClient();
    } catch (e: unknown) {
      console.error('Onboarding save error:', e);
      setError(
        e instanceof Error
          ? e.message
          : 'Could not save profile. You can continue and finish later.',
      );
      // Still exit — local onboarded flag prevents trap loop
      finishClient();
    } finally {
      setBusy(false);
    }
  };

  const finishFirstDream = () => void persist('first_dream');
  const exploreApp = () => void persist('explore');

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[oklch(0.98_0.005_80)]">
      <div className="mx-auto min-h-full max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between text-xs text-muted">
          <div>
            Step {step + 1} of {STEPS}
          </div>
          <button
            type="button"
            onClick={exploreApp}
            className="hover:underline"
            disabled={busy}
          >
            Skip for now
          </button>
        </div>

        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-line/60">
          <div
            className="h-full rounded-full bg-sage transition-all duration-300"
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
                A private space to capture dreams, understand what they mean, and turn them into
                images you can keep — with sleep context when you want it.
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

          {/* Step 2 (UI): goals — clear selected shading */}
          {step === 1 && (
            <motion.div key="goals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="mb-2 text-2xl font-semibold">What brings you here?</h2>
              <p className="mb-2 text-muted">
                Pick at least one. We’ll prioritise education and prompts around understanding and
                visualising your dreams.
              </p>
              {prefillNote && (
                <p className="mb-4 text-xs text-sageDark bg-sage/10 border border-sage/20 rounded-xl px-3 py-2">
                  {prefillNote}
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ONBOARDING_GOALS.map((g) => {
                  const selected = answers.goals.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGoal(g.id)}
                      aria-pressed={selected}
                      className={selectCardClass(selected)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-ink">{g.label}</div>
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                            selected
                              ? 'border-sage bg-sage text-cream'
                              : 'border-line bg-white text-transparent'
                          }`}
                          aria-hidden
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted leading-relaxed">{g.blurb}</div>
                    </button>
                  );
                })}
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

          {/* Step 3: interests */}
          {step === 2 && (
            <motion.div key="interests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="mb-2 text-2xl font-semibold">Any topics you’re curious about?</h2>
              <p className="mb-2 text-muted">
                Optional. Pre-filled from your profile and linked social accounts (Spotify, Meta) when available —
                same idea as interests on dating apps. Edit freely.
              </p>
              {prefillNote && answers.interests.length > 0 && (
                <p className="mb-4 text-xs text-muted">
                  {answers.interests.length} selected — tap to toggle.
                </p>
              )}
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

          {/* Step 4 (UI): experience + recall — clear selected shading */}
          {step === 3 && (
            <motion.div key="experience" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="mb-2 text-2xl font-semibold">Where are you starting from?</h2>
              <p className="mb-4 text-muted">So we don’t over- or under-explain.</p>
              <div className="space-y-3 mb-8">
                {EXPERIENCE_OPTIONS.map((o) => {
                  const selected = answers.experienceLevel === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => patch({ experienceLevel: o.id as ExperienceLevel })}
                      aria-pressed={selected}
                      className={`w-full ${selectCardClass(selected)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-ink">{o.label}</div>
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? 'border-sage bg-sage text-cream'
                              : 'border-line bg-white'
                          }`}
                          aria-hidden
                        >
                          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted">{o.note}</div>
                    </button>
                  );
                })}
              </div>
              <h3 className="mb-3 text-lg font-semibold">How often do you remember dreams?</h3>
              <div className="space-y-3">
                {RECALL_OPTIONS.map((o) => {
                  const selected = answers.dreamRecall === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => patch({ dreamRecall: o.id as DreamRecallLevel })}
                      aria-pressed={selected}
                      className={`w-full ${selectCardClass(selected)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-ink">{o.label}</div>
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? 'border-sage bg-sage text-cream'
                              : 'border-line bg-white'
                          }`}
                          aria-hidden
                        >
                          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted">{o.note}</div>
                    </button>
                  );
                })}
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
                    className="w-full accent-sage"
                  />
                  <div className="mt-2 flex justify-between text-xs text-muted">
                    <span>3h</span>
                    <span>12h</span>
                  </div>
                </>
              )}
              <label
                className={`mt-6 flex items-center gap-3 rounded-2xl border p-4 text-sm cursor-pointer transition ${
                  answers.skippedSleep
                    ? 'border-sage bg-sage/15 ring-2 ring-sage/30'
                    : 'border-line bg-cream/60 hover:bg-parchment/60'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-sage"
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

          {/* Step 6 (UI): product offerings 2×2 */}
          {step === 5 && (
            <motion.div key="offerings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-2 flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-sageDark" />
                <h2 className="text-2xl font-semibold">What EverDream offers</h2>
              </div>
              <p className="mb-5 text-muted">
                Built for people who want to <strong className="font-medium text-ink">understand</strong> their
                dreams and <strong className="font-medium text-ink">see</strong> them — not a lucidity bootcamp.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {ONBOARDING_OFFERINGS.map((o) => (
                  <div
                    key={o.id}
                    className={`rounded-2xl border border-line bg-gradient-to-br ${o.accent} p-3.5 sm:p-4 shadow-paper flex flex-col min-h-[148px]`}
                  >
                    <div
                      className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 border border-line text-2xl shadow-sm"
                      aria-hidden
                    >
                      {o.icon}
                    </div>
                    <h3 className="font-semibold text-ink text-sm sm:text-base leading-snug">{o.title}</h3>
                    <p className="mt-1.5 text-[11px] sm:text-xs text-muted leading-relaxed flex-1">
                      {o.description}
                    </p>
                  </div>
                ))}
              </div>

              {preview.length > 0 && (
                <div className="mt-5 rounded-2xl border border-line bg-white/70 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-sageDark" />
                    <p className="text-xs uppercase tracking-[0.16em] text-muted font-medium">
                      Personalised for you
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {preview.slice(0, 2).map((line) => (
                      <li key={line} className="text-sm text-ink/85 leading-relaxed flex gap-2">
                        <span className="text-sageDark shrink-0">·</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
              className="py-8 text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-9 w-9 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">You’re set.</h2>
              <p className="mx-auto mt-3 max-w-sm text-muted">
                Preferences are saved. Capture a dream when you’re ready — or look around the home
                screen first.
              </p>
              {error && <p className="mt-4 text-sm text-amber-700">{error}</p>}
              <div className="mt-10 flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
                <Button
                  size="lg"
                  onClick={finishFirstDream}
                  disabled={busy}
                  className="w-full"
                  icon={busy ? <Loader2 className="animate-spin" /> : <PenLine size={18} />}
                >
                  {busy ? 'Saving…' : 'Start my first dream entry'}
                </Button>
                <button
                  type="button"
                  onClick={exploreApp}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-cream hover:bg-parchment py-3.5 text-sm font-semibold text-ink transition disabled:opacity-50"
                >
                  <Compass className="w-4 h-4 text-sageDark" />
                  Explore the app first
                </button>
                <p className="text-[11px] text-muted leading-relaxed px-2">
                  Explore opens Home. Journal anytime from the capture button or “Journal about this”.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default OnboardingFlow;
