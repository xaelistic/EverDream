import { describe, expect, it } from 'vitest';
import { encodePcm16Wav, mixToMono, peaksFromChannel, resampleMono } from './whisperAudio';

describe('whisperAudio', () => {
  it('mixes channels and resamples down to 16 kHz', () => {
    const left = new Float32Array([0, 1, 0, -1]);
    const right = new Float32Array([0, -1, 0, 1]);
    const mono = mixToMono([left, right]);
    expect(Array.from(mono)).toEqual([0, 0, 0, 0]);
    const speech = resampleMono(new Float32Array([0, 1, 0, -1]), 4, 2);
    expect(speech.length).toBe(2);
  });

  it('writes a mono wav header and keeps loud peaks tall', () => {
    const wav = encodePcm16Wav(new Float32Array([0, 0.5]), 16000);
    expect(wav.type).toBe('audio/wav');
    expect(wav.size).toBe(48);
    const samples = new Float32Array(8);
    samples[1] = 1;
    const peaks = peaksFromChannel(samples, 4);
    expect(peaks).toHaveLength(4);
    expect(Math.max(...peaks)).toBeCloseTo(1);
    expect(Math.min(...peaks)).toBeGreaterThan(0);
  });
});
