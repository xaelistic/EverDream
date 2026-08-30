/**
 * Score a still for image-to-video fitness.
 * I2V models smear soft, tiny, or clipped frames into Ken-Burns mush.
 */

export type ImageQualityVerdict = 'pass' | 'warn' | 'fail';

export interface ImageQualityMetrics {
  width: number;
  height: number;
  bytes?: number;
  sharpness: number;
  contrast: number;
  brightness: number;
  https: boolean;
}

export interface ImageQualityReport {
  url: string;
  score: number;
  verdict: ImageQualityVerdict;
  metrics: ImageQualityMetrics;
  reasons: string[];
}

const MIN_EDGE = 512;
const PREFERRED_EDGE = 1024;

export function scoreImageMetrics(metrics: ImageQualityMetrics, url = ''): ImageQualityReport {
  const reasons: string[] = [];
  let score = 0;

  const minEdge = Math.min(metrics.width, metrics.height);
  const maxEdge = Math.max(metrics.width, metrics.height);
  const aspect = maxEdge / Math.max(1, minEdge);

  if (minEdge >= PREFERRED_EDGE) score += 30;
  else if (minEdge >= 768) score += 22;
  else if (minEdge >= MIN_EDGE) score += 12;
  else {
    reasons.push('too-small');
  }

  if (aspect > 2.2) reasons.push('extreme-aspect');
  else score += 8;

  const sharpness = clamp01(metrics.sharpness);
  score += Math.round(sharpness * 28);
  if (sharpness < 0.22) reasons.push('soft');

  const contrast = clamp01(metrics.contrast);
  score += Math.round(contrast * 18);
  if (contrast < 0.18) reasons.push('flat');

  const brightness = clamp01(metrics.brightness);
  if (brightness < 0.12) reasons.push('too-dark');
  else if (brightness > 0.92) reasons.push('too-bright');
  else score += 10;

  if (metrics.https) score += 6;
  else reasons.push('not-https');

  score = Math.max(0, Math.min(100, score));
  const verdict: ImageQualityVerdict =
    score < 42 || reasons.includes('too-small') ? 'fail' : score < 64 ? 'warn' : 'pass';

  if (verdict === 'fail' && !reasons.length) reasons.push('low-score');

  return { url, score, verdict, metrics, reasons };
}

export function combineImageQuality(reports: ImageQualityReport[]): ImageQualityReport {
  if (!reports.length) {
    return scoreImageMetrics({
      width: 0,
      height: 0,
      sharpness: 0,
      contrast: 0,
      brightness: 0.5,
      https: false,
    });
  }
  const score = Math.round(reports.reduce((sum, r) => sum + r.score, 0) / reports.length);
  const reasons = [...new Set(reports.flatMap((r) => r.reasons))];
  const worst = reports.some((r) => r.verdict === 'fail')
    ? 'fail'
    : reports.some((r) => r.verdict === 'warn')
      ? 'warn'
      : 'pass';
  return {
    url: reports[0].url,
    score,
    verdict: worst === 'pass' && score < 64 ? 'warn' : worst,
    metrics: reports[0].metrics,
    reasons,
  };
}

export async function inspectImageForVideo(url: string): Promise<ImageQualityReport> {
  const https = /^https:\/\//i.test(url) && !url.startsWith('data:');
  if (typeof document === 'undefined') {
    return scoreImageMetrics({
      width: https ? 1024 : 0,
      height: https ? 1024 : 0,
      sharpness: 0.5,
      contrast: 0.5,
      brightness: 0.5,
      https,
    }, url);
  }

  try {
    const img = await loadImage(url);
    const metrics = sampleMetrics(img, https);
    return scoreImageMetrics(metrics, url);
  } catch {
    return scoreImageMetrics({
      width: 0,
      height: 0,
      sharpness: 0,
      contrast: 0,
      brightness: 0.5,
      https,
    }, url);
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}

function sampleMetrics(img: HTMLImageElement, https: boolean): ImageQualityMetrics {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { width, height, sharpness: 0.4, contrast: 0.4, brightness: 0.5, https };
  }
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const lumas: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    lumas.push((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255);
  }
  const mean = lumas.reduce((a, b) => a + b, 0) / lumas.length;
  const variance = lumas.reduce((a, b) => a + (b - mean) ** 2, 0) / lumas.length;
  let edge = 0;
  let edgeCount = 0;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      const gx = lumas[i + 1] - lumas[i - 1];
      const gy = lumas[i + size] - lumas[i - size];
      edge += Math.abs(gx) + Math.abs(gy);
      edgeCount += 1;
    }
  }
  const sharpness = Math.min(1, (edge / Math.max(1, edgeCount)) / 0.35);
  const contrast = Math.min(1, Math.sqrt(variance) / 0.28);
  return { width, height, sharpness, contrast, brightness: mean, https };
}

export function qualityFailMessage(report: ImageQualityReport): string {
  const bits = report.reasons
    .map((reason) => {
      if (reason === 'too-small') return 'the still is too small';
      if (reason === 'soft') return 'the still is too soft';
      if (reason === 'flat') return 'contrast is too low';
      if (reason === 'too-dark') return 'the frame is too dark';
      if (reason === 'too-bright') return 'the frame is blown out';
      if (reason === 'not-https') return 'the still is not uploaded yet';
      if (reason === 'extreme-aspect') return 'the crop is too skinny for a clip';
      return reason;
    })
    .slice(0, 3);
  return `These stills scored ${report.score}/100${bits.length ? ` (${bits.join(', ')})` : ''}. Regenerate the storyboard before making a clip.`;
}
