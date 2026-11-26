import { describe, expect, it } from 'vitest';
import { cameraIdeal, stillMatchesVideo, thumbnailCanvasSize } from './videoThumbnail';

describe('thumbnailCanvasSize', () => {
  it('keeps a portrait buffer portrait', () => {
    expect(thumbnailCanvasSize(1080, 1920, true)).toEqual({
      width: 1080,
      height: 1920,
      rotateClockwise: false,
    });
  });

  it('stands a landscape buffer up when the phone is portrait', () => {
    expect(thumbnailCanvasSize(1920, 1080, true)).toEqual({
      width: 1080,
      height: 1920,
      rotateClockwise: true,
    });
  });

  it('does not invent a frame when the size is missing', () => {
    expect(thumbnailCanvasSize(0, 0, true)).toBeNull();
  });
});

describe('stillMatchesVideo', () => {
  it('rejects a landscape still for a portrait video', () => {
    expect(stillMatchesVideo(1920, 1080, true)).toBe(false);
    expect(stillMatchesVideo(1080, 1920, true)).toBe(true);
  });
});

describe('cameraIdeal', () => {
  it('asks a portrait phone for a portrait frame', () => {
    expect(cameraIdeal(true)).toEqual({ width: { ideal: 1080 }, height: { ideal: 1920 } });
  });
});
