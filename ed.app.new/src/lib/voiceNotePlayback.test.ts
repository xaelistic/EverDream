import { describe, expect, it } from 'vitest';
import {
  formatPlaybackClock,
  playbackClockLabel,
  playbackRatio,
  resolvePlaybackDuration,
} from './voiceNotePlayback';

describe('voice note playback', () => {
  it('formats the clock from the current second', () => {
    expect(formatPlaybackClock(0)).toBe('0:00');
    expect(formatPlaybackClock(4.9)).toBe('0:04');
    expect(formatPlaybackClock(65)).toBe('1:05');
    expect(formatPlaybackClock(Number.POSITIVE_INFINITY)).toBe('0:00');
  });

  it('shows elapsed time against the recording length', () => {
    expect(playbackClockLabel(4, 20)).toBe('0:04 / 0:20');
    expect(playbackClockLabel(4, 0)).toBe('0:04');
  });

  it('places the playhead at the current time in the recording', () => {
    expect(playbackRatio(0, 10)).toBe(0);
    expect(playbackRatio(4, 10)).toBe(0.4);
    expect(playbackRatio(12, 10)).toBe(1);
    expect(playbackRatio(4, 0)).toBe(0);
    expect(playbackRatio(4, Number.POSITIVE_INFINITY)).toBe(0);
    expect(playbackRatio(Number.NaN, 10)).toBe(0);
  });

  it('uses a stored length when the file does not report one', () => {
    expect(resolvePlaybackDuration(12, 10)).toBe(12);
    expect(resolvePlaybackDuration(Number.POSITIVE_INFINITY, 10)).toBe(10);
    expect(resolvePlaybackDuration(Number.NaN, 10)).toBe(10);
    expect(resolvePlaybackDuration(0, 0)).toBe(0);
  });
});
