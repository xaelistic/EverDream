/**
 * Daily reflection content — quotes, education rotation, prompts
 * Education can be personalised from onboarding goals/interests.
 */

import {
  SLEEP_EDUCATION_CONTENT,
  type EducationModule,
} from './sleepEducation';
import {
  deriveEducationTags,
  type InterestId,
  type OnboardingGoalId,
} from './onboarding/model';

export interface DailyQuote {
  text: string;
  source: string;
  prompt: string;
}

const DAILY_QUOTES: DailyQuote[] = [
  {
    text: 'Dreams are the touchstones of our character.',
    source: 'Henry David Thoreau',
    prompt: 'What part of yourself showed up in your dreams lately?',
  },
  {
    text: 'The best bridge between despair and hope is a good night\u2019s sleep.',
    source: 'E. Joseph Cossman',
    prompt: 'How did rest shape your mood this morning?',
  },
  {
    text: 'A dream you dream alone is only a dream. A dream you dream together is reality.',
    source: 'John Lennon',
    prompt: 'Who or what felt most alive in your inner world last night?',
  },
  {
    text: 'Sleep is the best meditation.',
    source: 'Dalai Lama',
    prompt: 'What would help you wind down better tonight?',
  },
  {
    text: 'Morning is wonderful. Its only drawback is that it comes at such an inconvenient time of day.',
    source: 'Glen Cook',
    prompt: 'Capture one image or feeling before the day pulls you away.',
  },
  {
    text: 'We are such stuff as dreams are made on, and our little life is rounded with a sleep.',
    source: 'William Shakespeare',
    prompt: 'If last night\u2019s dream had a title, what would it be?',
  },
  {
    text: 'Your vision will become clear only when you can look into your own heart. Who looks outside, dreams; who looks inside, awakes.',
    source: 'Carl Jung',
    prompt: 'What symbol keeps returning in your dreams?',
  },
];

function dayIndex(): number {
  return Math.floor(Date.now() / 86_400_000);
}

export function getDailyQuote(): DailyQuote {
  return DAILY_QUOTES[dayIndex() % DAILY_QUOTES.length];
}

/** Calendar rotation (no personalization). */
export function getDailyEducation(): EducationModule {
  return SLEEP_EDUCATION_CONTENT[dayIndex() % SLEEP_EDUCATION_CONTENT.length];
}

/**
 * Rank education modules by onboarding signals.
 * - Prefer matching category / id tags from goals+interests
 * - Boost lucid / recall content when relevant
 * - Stable day-based pick among top matches so content still rotates
 */
export function getPersonalizedDailyEducation(opts?: {
  goalIds?: OnboardingGoalId[];
  interestIds?: InterestId[];
  /** Free-text interest labels (profile) */
  interestLabels?: string[];
}): EducationModule {
  const goalIds = opts?.goalIds ?? [];
  const interestIds = opts?.interestIds ?? [];
  const tags = new Set(deriveEducationTags(goalIds, interestIds));

  // also soft-match free-text labels
  const labelBlob = (opts?.interestLabels ?? []).join(' ').toLowerCase();
  if (/lucid/.test(labelBlob)) tags.add('lucid_dreaming').add('dreams');
  if (/recall|journal/.test(labelBlob)) tags.add('journaling_habit').add('dreams');
  if (/sleep|hygiene|circadian/.test(labelBlob)) {
    tags.add('sleep_hygiene');
    tags.add('circadian');
  }
  if (/symbol|jung|psych/.test(labelBlob)) tags.add('psychology').add('dreams');
  if (/meditat|wind/.test(labelBlob)) tags.add('meditation').add('sleep_hygiene');
  if (/creat/.test(labelBlob)) tags.add('creativity').add('dreams');
  if (/nightmare|anxiet/.test(labelBlob)) tags.add('psychology').add('dreams');

  if (tags.size === 0) return getDailyEducation();

  const scored = SLEEP_EDUCATION_CONTENT.map((mod, index) => {
    let score = 0;
    if (tags.has(mod.category)) score += 3;
    if (tags.has(mod.id)) score += 4;
    // keyword boosts in title/content
    const hay = `${mod.id} ${mod.title} ${mod.category}`.toLowerCase();
    if (tags.has('lucid_dreaming') && /lucid|rem|dream/.test(hay)) score += 2;
    if (tags.has('journaling_habit') && /dream|journal|recall/.test(hay)) score += 2;
    if (tags.has('meditation') && /meditat|wind|routine/.test(hay)) score += 2;
    if (tags.has('creativity') && /dream|creat/.test(hay)) score += 1;
    // slight index noise so ties rotate by day
    score += ((index + dayIndex()) % 5) * 0.01;
    return { mod, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score >= 2);
  const pool = top.length ? top : scored;
  return pool[dayIndex() % Math.min(pool.length, 5)].mod;
}

export function getJournalPromptForQuote(quote: DailyQuote): string {
  return `Today's reflection: ${quote.prompt}\n\n"${quote.text}" — ${quote.source}`;
}
