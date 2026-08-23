import { describe, expect, it } from 'vitest';
import {
  SLEEP_EDUCATION_CONTENT,
  educationPalette,
  pickWindDownCards,
} from './sleepEducation';

describe('sleep education cards', () => {
  it('covers quotes and guides with palettes for full-screen cards', () => {
    const quotes = SLEEP_EDUCATION_CONTENT.filter((m) => m.kind === 'quote');
    const guides = SLEEP_EDUCATION_CONTENT.filter((m) => m.kind === 'guide');
    expect(quotes.length).toBeGreaterThanOrEqual(10);
    expect(guides.length).toBeGreaterThanOrEqual(10);
    expect(SLEEP_EDUCATION_CONTENT.every((m) => educationPalette(m))).toBe(true);
  });

  it('picks wind-down cards from mood instead of dumping little boxes', () => {
    const anxious = pickWindDownCards({ label: 'Anxious', energy: 0.4, valence: -0.4 });
    expect(anxious.length).toBeGreaterThan(0);
    expect(anxious.some((m) => m.id === 'worry-hour' || m.kind === 'quote')).toBe(true);
  });
});
