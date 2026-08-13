import { describe, expect, it } from 'vitest';
import { SHARE_FORMATS, dreamToShareInput } from './shareCard';

describe('share card formats', () => {
  it('uses 9:16 for stories, 1:1 for Facebook, 1.91:1 for link previews', () => {
    expect(SHARE_FORMATS.story.width / SHARE_FORMATS.story.height).toBeCloseTo(9 / 16, 3);
    expect(SHARE_FORMATS.feed.width).toBe(SHARE_FORMATS.feed.height);
    expect(SHARE_FORMATS.link).toMatchObject({ width: 1200, height: 630 });
  });

  it('carries title onto the card input', () => {
    const input = dreamToShareInput({
      title: 'The harbour at dawn',
      nugget: 'I flew over a golden harbour',
      content: 'longer',
      date: '2026-08-13',
      generatedImage: { url: 'https://example.com/dream.png' },
    });
    expect(input.title).toBe('The harbour at dawn');
    expect(input.imageUrl).toBe('https://example.com/dream.png');
  });
});
