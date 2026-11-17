/**
 * How hard a dream telling is, from the transcript alone.
 *
 * Word count is the size. Average word length stands in for density:
 * everyday words sit near 4 characters, so longer words raise the score
 * as if the telling were longer. Model effort and the wait both follow
 * that score.
 */

export type AnalysisTier = 'light' | 'standard' | 'deep';
export type ReasoningEffort = 'none' | 'low';

export interface AnalysisPlan {
  words: number;
  avgWordLength: number;
  /** Word count scaled up when the words themselves are long. */
  score: number;
  tier: AnalysisTier;
  /** How long this pass may run, in milliseconds. */
  timeoutMs: number;
  maxTokens: number;
  effort: ReasoningEffort;
}

const EVERYDAY_WORD = 4.2;
const MIN_TIMEOUT_MS = 6_000;
const MAX_TIMEOUT_MS = 26_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function planDreamAnalysis(text: string): AnalysisPlan {
  const words = text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? [];
  const count = words.length;
  const avg = count === 0
    ? 0
    : words.reduce((sum, word) => sum + word.length, 0) / count;
  const density = 1 + Math.max(0, avg - EVERYDAY_WORD) * 0.25;
  const score = Math.round(count * density * 10) / 10;
  const timeoutMs = clamp(Math.round(5500 + score * 28), MIN_TIMEOUT_MS, MAX_TIMEOUT_MS);
  const avgWordLength = Math.round(avg * 10) / 10;

  if (score < 90) {
    return {
      words: count,
      avgWordLength,
      score,
      tier: 'light',
      timeoutMs,
      maxTokens: 500,
      effort: 'none',
    };
  }
  if (score < 240) {
    return {
      words: count,
      avgWordLength,
      score,
      tier: 'standard',
      timeoutMs,
      maxTokens: 800,
      effort: 'low',
    };
  }
  return {
    words: count,
    avgWordLength,
    score,
    tier: 'deep',
    timeoutMs,
    maxTokens: 1400,
    effort: 'low',
  };
}
