import { describe, expect, it } from 'vitest';
import {
  deriveDreamTitle,
  formatDreamWhen,
  normalizeCategory,
  normalizeEmotion,
  presentDream,
} from './dreamClassify';

describe('dreamClassify', () => {
  it('maps model aliases instead of uncategorized', () => {
    expect(normalizeCategory('Fear', 'I was flying above the city')).toBe('nightmare');
    expect(normalizeCategory('flying', 'we soared over the ocean')).toBe('adventure');
    expect(normalizeCategory('calm', 'a quiet garden')).toBe('peaceful');
    expect(normalizeCategory('video-journal', 'I was chased by a monster')).toBe('nightmare');
    expect(normalizeCategory('uncategorized', 'I knew I was dreaming and took control')).toBe('lucid');
  });

  it('prefers face emotion over a generic model label', () => {
    expect(normalizeEmotion('neutral', { face: 'happy', text: 'something odd happened' })).toBe('joy');
    expect(normalizeEmotion('Fear', { face: 'happy', text: 'I was laughing' })).toBe('joy');
    expect(normalizeEmotion('confused', { text: 'I was terrified and ran' })).toBe('fear');
  });

  it('derives a title instead of a processing label', () => {
    expect(deriveDreamTitle('The library owl turned every page into moonlight', 'longer')).toBe(
      'The library owl turned every page into moonlight',
    );
    expect(deriveDreamTitle('Video journal (0:42)', 'I flew over a golden harbour at dawn.')).toBe(
      'I flew over a golden harbour at dawn.',
    );
  });

  it('formats recent dates as Today / Yesterday', () => {
    const today = formatDreamWhen(new Date().toISOString());
    expect(today.primary).toBe('Today');
    const y = new Date();
    y.setDate(y.getDate() - 1);
    expect(formatDreamWhen(y.toISOString()).primary).toBe('Yesterday');
  });

  it('presents old uncategorized dreams with a real category and mood label', () => {
    const presented = presentDream({
      category: 'uncategorized',
      emotion: 'Fear',
      nugget: 'Video journal (1:12)',
      content: 'I was flying over the ocean and laughing.',
      date: new Date().toISOString(),
    });
    expect(presented.category).toBe('adventure');
    expect(presented.emotion).toBe('fear');
    expect(presented.emotionName).toBe('Fear');
    expect(presented.title).toMatch(/flying|ocean|laughing/i);
    expect(presented.when.primary).toBe('Today');
  });
});
