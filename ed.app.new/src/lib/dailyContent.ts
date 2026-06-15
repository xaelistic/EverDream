/**
 * Daily reflection content — quotes, education rotation, prompts
 */

import { SLEEP_EDUCATION_CONTENT, type EducationModule } from './sleepEducation';

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

export function getDailyEducation(): EducationModule {
  return SLEEP_EDUCATION_CONTENT[dayIndex() % SLEEP_EDUCATION_CONTENT.length];
}

export function getJournalPromptForQuote(quote: DailyQuote): string {
  return `Today's reflection: ${quote.prompt}\n\n"${quote.text}" — ${quote.source}`;
}