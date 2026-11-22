const WHISPER_RATE = 16000;

export function mixToMono(channels: Float32Array[]): Float32Array {
  const length = channels[0]?.length ?? 0;
  const out = new Float32Array(length);
  if (!channels.length || length === 0) return out;
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const channel of channels) sum += channel[i] || 0;
    out[i] = sum / channels.length;
  }
  return out;
}

export function resampleMono(samples: Float32Array, fromRate: number, toRate = WHISPER_RATE): Float32Array {
  if (samples.length === 0) return samples;
  if (!fromRate || fromRate === toRate) return samples;
  const length = Math.max(1, Math.round((samples.length * toRate) / fromRate));
  const out = new Float32Array(length);
  const last = samples.length - 1;
  for (let i = 0; i < length; i++) {
    const src = (i * fromRate) / toRate;
    const i0 = Math.min(last, Math.floor(src));
    const i1 = Math.min(last, i0 + 1);
    const t = src - i0;
    out[i] = samples[i0] * (1 - t) + samples[i1] * t;
  }
  return out;
}

export function encodePcm16Wav(samples: Float32Array, sampleRate = WHISPER_RATE): Blob {
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export function whisperWavFromChannels(channels: Float32Array[], sampleRate: number): Blob {
  return encodePcm16Wav(resampleMono(mixToMono(channels), sampleRate, WHISPER_RATE), WHISPER_RATE);
}

export function peaksFromChannel(samples: Float32Array, bars: number): number[] {
  const count = Math.max(1, bars);
  if (samples.length === 0) return Array.from({ length: count }, () => 0.08);
  const size = Math.max(1, Math.floor(samples.length / count));
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    let max = 0;
    const start = i * size;
    const end = Math.min(samples.length, start + size);
    for (let j = start; j < end; j++) {
      const value = Math.abs(samples[j]);
      if (value > max) max = value;
    }
    peaks.push(max);
  }
  const top = Math.max(...peaks, 0.01);
  return peaks.map((peak) => Math.max(0.08, peak / top));
}
