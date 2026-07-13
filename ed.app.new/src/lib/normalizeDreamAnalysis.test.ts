import { describe, expect, it } from 'vitest';
import {
  coerceNarrativeText,
  isNVCNTMatrix,
  normalizeDreamAnalysis,
  sanitizeDreamForUI,
} from './normalizeDreamAnalysis';

describe('normalizeDreamAnalysis', () => {
  it('coerces NVCNT narrative objects to summary text', () => {
    const narrative = { score: 0.8, summary: 'Flying over a golden ocean.' };
    expect(coerceNarrativeText(narrative)).toBe('Flying over a golden ocean.');
    expect(isNVCNTMatrix({ narrative })).toBe(true);
  });

  it('converts full NVCNT matrix into DreamAnalysis fields', () => {
    const normalized = normalizeDreamAnalysis(
      {
        narrative: { score: 0.7, summary: 'A vivid chase through corridors.' },
        valence: { score: 0.6, polarity: -0.4 },
        complexity: { conceptual_payload: [{ concept: 'doors' }] },
        novelty: { unique_identifiers: ['chase', 'hallway'] },
      },
      'fallback text',
    );

    expect(normalized.narrative).toBe('A vivid chase through corridors.');
    expect(normalized.nugget).toBe('A vivid chase through corridors.');
    expect(normalized.category).toBe('anxiety');
    expect(normalized.symbols).toEqual(['doors']);
  });

  it('sanitizes persisted dreams before UI render', () => {
    const sanitized = sanitizeDreamForUI({
      id: '1',
      content: 'Original dream text',
      narrative: { score: 1, summary: 'Stored summary' },
      nugget: '',
    });

    expect(sanitized.narrative).toBe('Stored summary');
    expect(sanitized.nugget).toBe('Stored summary');
  });
});