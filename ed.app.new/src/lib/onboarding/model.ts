/**
 * Onboarding domain — goals, interests, education tags.
 * Single source of truth for chips + profile payload + education ranking.
 */

export type OnboardingGoalId =
  | 'better_recall'
  | 'understand_dreams'
  | 'lucid_dreaming'
  | 'better_sleep'
  | 'emotional_insight'
  | 'creative_inspiration';

export type ExperienceLevel = 'beginner' | 'some_experience' | 'regular';
export type DreamRecallLevel = 'rarely' | 'sometimes' | 'often';

export type InterestId =
  | 'lucid_dreaming'
  | 'dream_symbols'
  | 'sleep_science'
  | 'nightmares'
  | 'meditation'
  | 'creativity'
  | 'psychology'
  | 'circadian'
  | 'wearables'
  | 'journaling_habit';

export interface OnboardingGoalOption {
  id: OnboardingGoalId;
  label: string;
  blurb: string;
  /** Human label stored in dream_goals / interests display */
  profileLabel: string;
  educationTags: string[];
}

export interface InterestOption {
  id: InterestId;
  label: string;
  educationTags: string[];
}

export const ONBOARDING_GOALS: OnboardingGoalOption[] = [
  {
    id: 'better_recall',
    label: 'Remember more dreams',
    blurb: 'Build morning capture habit & recall cues',
    profileLabel: 'Better dream recall',
    educationTags: ['dreams', 'sleep_hygiene', 'journaling_habit'],
  },
  {
    id: 'understand_dreams',
    label: 'Understand my dreams',
    blurb: 'Symbols, themes, and patterns over time',
    profileLabel: 'Dream meaning',
    educationTags: ['dreams', 'psychology'],
  },
  {
    id: 'lucid_dreaming',
    label: 'Learn lucid dreaming',
    blurb: 'Reality checks, MILD, and induction basics',
    profileLabel: 'Lucid dreaming',
    educationTags: ['dreams', 'lucid_dreaming'],
  },
  {
    id: 'better_sleep',
    label: 'Sleep better',
    blurb: 'Hygiene, circadian rhythm, wind-down',
    profileLabel: 'Better sleep',
    educationTags: ['sleep_hygiene', 'circadian', 'environment'],
  },
  {
    id: 'emotional_insight',
    label: 'Emotional insight',
    blurb: 'Process feelings that show up at night',
    profileLabel: 'Emotional insight',
    educationTags: ['psychology', 'dreams'],
  },
  {
    id: 'creative_inspiration',
    label: 'Creative inspiration',
    blurb: 'Use dreams as fuel for ideas and art',
    profileLabel: 'Creative inspiration',
    educationTags: ['creativity', 'dreams'],
  },
];

export const ONBOARDING_INTERESTS: InterestOption[] = [
  { id: 'lucid_dreaming', label: 'Lucid dreaming', educationTags: ['dreams', 'lucid_dreaming'] },
  { id: 'dream_symbols', label: 'Symbols & archetypes', educationTags: ['dreams', 'psychology'] },
  { id: 'sleep_science', label: 'Sleep science', educationTags: ['sleep_hygiene', 'circadian'] },
  { id: 'nightmares', label: 'Nightmares & anxiety dreams', educationTags: ['psychology', 'dreams'] },
  { id: 'meditation', label: 'Meditation & wind-down', educationTags: ['sleep_hygiene', 'meditation'] },
  { id: 'creativity', label: 'Creativity', educationTags: ['creativity', 'dreams'] },
  { id: 'psychology', label: 'Psychology', educationTags: ['psychology'] },
  { id: 'circadian', label: 'Circadian rhythm', educationTags: ['circadian'] },
  { id: 'wearables', label: 'Wearables & sleep data', educationTags: ['circadian', 'sleep_hygiene'] },
  { id: 'journaling_habit', label: 'Journaling habit', educationTags: ['journaling_habit', 'dreams'] },
];

export const EXPERIENCE_OPTIONS: { id: ExperienceLevel; label: string; note: string }[] = [
  { id: 'beginner', label: 'Just starting', note: 'We’ll keep science light and habits simple.' },
  { id: 'some_experience', label: 'I’ve journaled before', note: 'We’ll skip the absolute basics when we can.' },
  { id: 'regular', label: 'Regular dreamer / lucid practice', note: 'We’ll lean into depth and technique.' },
];

export const RECALL_OPTIONS: { id: DreamRecallLevel; label: string; note: string }[] = [
  { id: 'rarely', label: 'Rarely remember', note: 'Morning capture + cues will be prioritised.' },
  { id: 'sometimes', label: 'Sometimes', note: 'We’ll help you catch the ones that slip away.' },
  { id: 'often', label: 'Often / vivid', note: 'We’ll focus on patterns and meaning.' },
];

export interface OnboardingAnswers {
  goals: OnboardingGoalId[];
  interests: InterestId[];
  experienceLevel: ExperienceLevel | null;
  dreamRecall: DreamRecallLevel | null;
  averageSleepHours: number | null;
  skippedSleep: boolean;
  birthDate: string;
  gender: 'female' | 'male' | 'non-binary' | 'prefer-not' | null;
  displayName: string;
}

export function emptyOnboardingAnswers(): OnboardingAnswers {
  return {
    goals: [],
    interests: [],
    experienceLevel: null,
    dreamRecall: null,
    averageSleepHours: 7,
    skippedSleep: false,
    birthDate: '',
    gender: null,
    displayName: '',
  };
}

export function goalLabels(ids: OnboardingGoalId[]): string[] {
  return ids
    .map((id) => ONBOARDING_GOALS.find((g) => g.id === id)?.profileLabel)
    .filter((x): x is string => Boolean(x));
}

export function interestLabels(ids: InterestId[]): string[] {
  return ids
    .map((id) => ONBOARDING_INTERESTS.find((i) => i.id === id)?.label)
    .filter((x): x is string => Boolean(x));
}

/** Tags used to rank education modules. */
export function deriveEducationTags(
  goals: OnboardingGoalId[],
  interests: InterestId[],
): string[] {
  const tags = new Set<string>();
  for (const g of goals) {
    ONBOARDING_GOALS.find((x) => x.id === g)?.educationTags.forEach((t) => tags.add(t));
  }
  for (const i of interests) {
    ONBOARDING_INTERESTS.find((x) => x.id === i)?.educationTags.forEach((t) => tags.add(t));
  }
  return [...tags];
}

export function focusPreviewLines(
  goals: OnboardingGoalId[],
  interests: InterestId[],
): string[] {
  const lines: string[] = [];
  if (goals.includes('better_recall') || interests.includes('journaling_habit')) {
    lines.push('Morning capture cues to lock in recall before the day starts.');
  }
  if (goals.includes('lucid_dreaming') || interests.includes('lucid_dreaming')) {
    lines.push('Lucidity primers: reality checks, MILD, and gentle induction.');
  }
  if (goals.includes('understand_dreams') || interests.includes('dream_symbols')) {
    lines.push('Theme & symbol education tied to what shows up in your journal.');
  }
  if (goals.includes('better_sleep') || interests.includes('sleep_science') || interests.includes('circadian')) {
    lines.push('Sleep hygiene and circadian tips matched to your nights.');
  }
  if (goals.includes('emotional_insight') || interests.includes('psychology') || interests.includes('nightmares')) {
    lines.push('Emotion-aware reflections when hard dreams land.');
  }
  if (goals.includes('creative_inspiration') || interests.includes('creativity')) {
    lines.push('Creative prompts that turn dream images into material.');
  }
  if (interests.includes('meditation')) {
    lines.push('Short wind-down and meditation ideas before bed.');
  }
  if (interests.includes('wearables')) {
    lines.push('How to read wearable sleep stages alongside dream notes.');
  }
  if (lines.length === 0) {
    lines.push('A balanced mix of dream science, sleep basics, and journaling habit.');
  }
  return lines.slice(0, 4);
}

export interface OnboardingProfilePayload {
  display_name?: string;
  birth_date: string | null;
  gender: string | null;
  onboarding_goals: string[];
  interests: string[];
  dream_goals: string[];
  average_sleep_hours: number | null;
  experience_level: string | null;
  dream_recall: string | null;
  onboarded_at: string;
}

export function buildProfilePayload(answers: OnboardingAnswers): OnboardingProfilePayload {
  const goals = goalLabels(answers.goals);
  const interests = interestLabels(answers.interests);
  return {
    display_name: answers.displayName.trim() || undefined,
    birth_date: answers.birthDate || null,
    gender: answers.gender,
    onboarding_goals: answers.goals,
    interests,
    dream_goals: goals,
    average_sleep_hours: answers.skippedSleep ? null : answers.averageSleepHours,
    experience_level: answers.experienceLevel,
    dream_recall: answers.dreamRecall,
    onboarded_at: new Date().toISOString(),
  };
}
