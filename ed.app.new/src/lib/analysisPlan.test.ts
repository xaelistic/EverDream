import { describe, expect, it } from 'vitest';
import { planDreamAnalysis } from './analysisPlan';

function line(count: number, word: string): string {
  return Array.from({ length: count }, () => word).join(' ');
}

describe('planDreamAnalysis', () => {
  it('keeps a short telling on the fast pass', () => {
    const plan = planDreamAnalysis(line(60, 'cat'));
    expect(plan.words).toBe(60);
    expect(plan.tier).toBe('light');
    expect(plan.effort).toBe('none');
    expect(plan.timeoutMs).toBe(7180);
    expect(plan.maxTokens).toBe(500);
  });

  it('treats long words as a denser telling of the same length', () => {
    const plain = planDreamAnalysis(line(60, 'cat'));
    const dense = planDreamAnalysis(line(60, 'labyrinth'));
    expect(dense.avgWordLength).toBeGreaterThan(plain.avgWordLength);
    expect(dense.score).toBeGreaterThan(plain.score);
    expect(dense.tier).toBe('standard');
    expect(dense.effort).toBe('low');
    expect(dense.timeoutMs).toBeGreaterThan(plain.timeoutMs);
    expect(dense.timeoutMs).toBe(9196);
  });

  it('uses the deeper pass and a longer wait for a long dense telling', () => {
    const plan = planDreamAnalysis(line(300, 'labyrinth'));
    expect(plan.tier).toBe('deep');
    expect(plan.timeoutMs).toBe(23980);
    expect(plan.maxTokens).toBe(1400);
  });

  it('does not wait past the cap', () => {
    const plan = planDreamAnalysis(line(900, 'labyrinth'));
    expect(plan.timeoutMs).toBe(26000);
    expect(plan.tier).toBe('deep');
  });
});
