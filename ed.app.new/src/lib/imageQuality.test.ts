import { describe, expect, it } from 'vitest';
import { combineImageQuality, qualityFailMessage, scoreImageMetrics } from './imageQuality';

describe('image quality for video', () => {
  it('passes a sharp 1024 https still', () => {
    const report = scoreImageMetrics({
      width: 1024,
      height: 1024,
      sharpness: 0.7,
      contrast: 0.5,
      brightness: 0.45,
      https: true,
    }, 'https://cdn.example/still.png');
    expect(report.verdict).toBe('pass');
    expect(report.score).toBeGreaterThanOrEqual(64);
    expect(report.reasons).toEqual([]);
  });

  it('fails a tiny or very soft frame', () => {
    const tiny = scoreImageMetrics({
      width: 256,
      height: 256,
      sharpness: 0.1,
      contrast: 0.1,
      brightness: 0.5,
      https: true,
    });
    expect(tiny.verdict).toBe('fail');
    expect(tiny.reasons).toContain('too-small');
    expect(qualityFailMessage(tiny)).toMatch(/too small/i);
  });

  it('warns on a soft but large still', () => {
    const report = scoreImageMetrics({
      width: 1024,
      height: 1024,
      sharpness: 0.15,
      contrast: 0.25,
      brightness: 0.4,
      https: true,
    });
    expect(report.reasons).toContain('soft');
    expect(['warn', 'fail']).toContain(report.verdict);
  });

  it('combines multiple frames by the worst verdict', () => {
    const pass = scoreImageMetrics({
      width: 1024,
      height: 1024,
      sharpness: 0.8,
      contrast: 0.6,
      brightness: 0.5,
      https: true,
    });
    const fail = scoreImageMetrics({
      width: 200,
      height: 200,
      sharpness: 0.1,
      contrast: 0.1,
      brightness: 0.5,
      https: false,
    });
    const combined = combineImageQuality([pass, fail]);
    expect(combined.verdict).toBe('fail');
    expect(combined.score).toBeLessThan(pass.score);
  });
});
