import { describe, expect, it } from 'vitest';
import { videoFrameStyle } from './videoFrame';

describe('videoFrameStyle', () => {
  it('keeps a portrait capture in portrait', () => {
    expect(videoFrameStyle(1080, 1920)).toEqual({ portrait: true, aspectRatio: '1080 / 1920' });
  });

  it('keeps a landscape capture wide', () => {
    expect(videoFrameStyle(1920, 1080)).toEqual({ portrait: false, aspectRatio: '1920 / 1080' });
  });

  it('falls back when the size is missing', () => {
    expect(videoFrameStyle(0, 0)).toEqual({ portrait: false, aspectRatio: '16 / 9' });
  });
});
