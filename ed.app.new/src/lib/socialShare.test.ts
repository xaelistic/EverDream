import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildSharePayload,
  getDreamImageUrl,
  getLinkedProviders,
  setProviderLinked,
  toShareableDream,
  SOCIAL_INTEGRATIONS_KEY,
} from './socialShare';

describe('socialShare', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes dream image URLs from generatedImage', () => {
    const dream = toShareableDream({
      id: '1',
      content: 'Flying over the ocean',
      date: '2026-06-16',
      generatedImage: { url: 'https://example.com/dream.jpg' },
    });

    expect(getDreamImageUrl(dream)).toBe('https://example.com/dream.jpg');
  });

  it('builds share payload with nugget text', () => {
    const payload = buildSharePayload({
      id: '1',
      title: 'Ocean flight',
      content: 'Long dream content here',
      nugget: 'I was flying',
      date: '2026-06-16',
    });

    expect(payload.title).toBe('Ocean flight');
    expect(payload.text).toContain('I was flying');
    expect(payload.text).toContain('EverDream');
  });

  it('persists linked providers in localStorage', () => {
    setProviderLinked('meta', true);
    setProviderLinked('instagram', true);

    const linked = getLinkedProviders();
    expect(linked.meta).toBe(true);
    expect(linked.instagram).toBe(true);
    expect(localStorage.getItem(SOCIAL_INTEGRATIONS_KEY)).toBeTruthy();
  });
});