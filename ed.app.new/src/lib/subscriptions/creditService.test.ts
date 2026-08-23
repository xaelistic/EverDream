import { describe, expect, it } from 'vitest';
import { CREDIT_PACKS, FREE_STARTER_CREDITS, starterRemainingFromUsed } from './creditService';

describe('credit packs', () => {
  it('exposes buyable packs with positive credit counts', () => {
    expect(CREDIT_PACKS.map((p) => p.id)).toEqual(['pack_20', 'pack_60', 'pack_150']);
    expect(CREDIT_PACKS.every((p) => p.credits > 0)).toBe(true);
  });
});

describe('free starter credits', () => {
  it('starts with about two weeks of nightly images and does not refill by month', () => {
    expect(FREE_STARTER_CREDITS).toBe(14);
    expect(starterRemainingFromUsed(0)).toBe(14);
    expect(starterRemainingFromUsed(3)).toBe(11);
    expect(starterRemainingFromUsed(14)).toBe(0);
    expect(starterRemainingFromUsed(20)).toBe(0);
  });
});
