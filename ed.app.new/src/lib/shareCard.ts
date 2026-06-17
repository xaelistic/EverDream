/**
 * Full-screen 9:16 share cards with EverDream watermark.
 * Uses native share sheet (Android/iOS) when available, download fallback otherwise.
 */

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export type ShareCardKind = 'reflection' | 'sleep' | 'dream';

export interface ReflectionCardInput {
  mood: string;
  energy: number;
  quote: string;
  quoteSource: string;
}

export interface SleepCardInput {
  durationMinutes: number;
  remMinutes?: number;
  quality?: number;
  source?: string;
  bedtime?: string;
  wakeTime?: string;
}

export interface DreamCardInput {
  nugget?: string;
  content?: string;
  emotion?: string;
  category?: string;
  date: string;
  imageUrl?: string;
}

const MOOD_EMOJI: Record<string, string> = {
  peaceful: '😌',
  anxious: '😰',
  excited: '🤩',
  tired: '😴',
  curious: '🤔',
  reflective: '✨',
};

/** Normalize wearable records and dream-embedded sleepData into one shape. */
export function normalizeSleepData(data: unknown): SleepCardInput | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  const durationMinutes =
    (typeof d.durationMinutes === 'number' ? d.durationMinutes : undefined) ??
    (typeof d.sleepDuration === 'number' ? d.sleepDuration : undefined);

  if (!durationMinutes || durationMinutes <= 0) return null;

  const remMinutes =
    (typeof d.remMinutes === 'number' ? d.remMinutes : undefined) ??
    (typeof d.estimatedREM === 'number' ? d.estimatedREM : undefined);

  const quality =
    (typeof d.score === 'number' ? d.score : undefined) ??
    (typeof d.quality === 'number' ? d.quality : undefined) ??
    (typeof d.sleepQuality === 'number' ? d.sleepQuality : undefined);

  return {
    durationMinutes,
    remMinutes,
    quality,
    source: typeof d.source === 'string' ? d.source : undefined,
    bedtime: typeof d.bedtime === 'string' ? d.bedtime : undefined,
    wakeTime: typeof d.wakeTime === 'string' ? d.wakeTime : undefined,
  };
}

export function dreamToShareInput(dream: {
  nugget?: string;
  content?: string;
  emotion?: string;
  category?: string;
  date: string;
  generatedImage?: { url: string };
}): DreamCardInput {
  return {
    nugget: dream.nugget,
    content: dream.content,
    emotion: dream.emotion,
    category: dream.category,
    date: dream.date,
    imageUrl: dream.generatedImage?.url,
  };
}

function createStoryCanvas(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  return ctx;
}

function drawSageBackground(ctx: CanvasRenderingContext2D): void {
  const { width: w, height: h } = ctx.canvas;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#f4f7f2');
  grad.addColorStop(0.35, '#e8f0e6');
  grad.addColorStop(0.7, '#d4e4d0');
  grad.addColorStop(1, '#7a9e7a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.12, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.15, h * 0.55, 220, 0, Math.PI * 2);
  ctx.fill();
}

function drawEverdreamWatermark(ctx: CanvasRenderingContext2D): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const barH = 160;

  const barGrad = ctx.createLinearGradient(0, h - barH, 0, h);
  barGrad.addColorStop(0, 'rgba(45, 58, 45, 0)');
  barGrad.addColorStop(0.35, 'rgba(45, 58, 45, 0.88)');
  barGrad.addColorStop(1, 'rgba(35, 48, 35, 0.95)');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, h - barH - 40, w, barH + 40);

  ctx.fillStyle = '#f4f7f2';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('EverDream', 72, h - 82);

  ctx.font = '26px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(232, 240, 230, 0.85)';
  ctx.fillText('everdream.app', 72, h - 38);

  ctx.font = '40px system-ui, sans-serif';
  ctx.fillText('🌙', w - 110, h - 62);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines?: number,
): number {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  let lines = 0;

  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, cy);
      line = word + ' ';
      cy += lineHeight;
      lines += 1;
      if (maxLines && lines >= maxLines) {
        ctx.fillText(line.trim() + '…', x, cy);
        return cy + lineHeight;
      }
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line.trim(), x, cy);
    cy += lineHeight;
  }
  return cy;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function formatTime(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return null;
  }
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateReflectionCard(input: ReflectionCardInput): Promise<Blob> {
  const ctx = createStoryCanvas();
  const w = STORY_WIDTH;
  const pad = 72;
  const contentBottom = STORY_HEIGHT - 200;

  drawSageBackground(ctx);

  const emoji = MOOD_EMOJI[input.mood] || '✨';
  ctx.font = '140px system-ui, sans-serif';
  ctx.fillText(emoji, pad, 200);

  ctx.fillStyle = '#2d3a2d';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('Morning Reflection', pad, 310);

  ctx.font = '32px system-ui, sans-serif';
  ctx.fillStyle = '#4a5d4a';
  ctx.fillText(`Mood · ${input.mood}`, pad, 380);

  const barY = 420;
  const barW = w - pad * 2;
  const barH = 28;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(pad, barY, barW, barH);
  ctx.fillStyle = '#5a7a5a';
  ctx.fillRect(pad, barY, barW * (input.energy / 100), barH);
  ctx.fillStyle = '#2d3a2d';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText(`Energy ${input.energy}%`, pad, barY + 64);

  ctx.fillStyle = '#2d3a2d';
  ctx.font = 'italic 38px Georgia, serif';
  const quoteEnd = wrapText(ctx, `"${input.quote}"`, pad, 560, w - pad * 2, 50, 6);

  ctx.font = '28px system-ui, sans-serif';
  ctx.fillStyle = '#5a6e5a';
  ctx.fillText(`— ${input.quoteSource}`, pad, Math.min(quoteEnd + 24, contentBottom - 40));

  drawEverdreamWatermark(ctx);
  return canvasToBlob(ctx.canvas);
}

export async function generateSleepCard(input: SleepCardInput): Promise<Blob> {
  const ctx = createStoryCanvas();
  const w = STORY_WIDTH;
  const pad = 72;

  drawSageBackground(ctx);

  ctx.font = '100px system-ui, sans-serif';
  ctx.fillText('😴', pad, 180);

  ctx.fillStyle = '#2d3a2d';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText("Last Night's Sleep", pad, 290);

  if (input.source) {
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillStyle = '#5a6e5a';
    ctx.fillText(input.source.toUpperCase(), pad, 340);
  }

  ctx.font = 'bold 96px Georgia, serif';
  ctx.fillStyle = '#2d3a2d';
  ctx.fillText(formatDuration(input.durationMinutes), pad, 480);

  const statsY = 560;
  ctx.font = '30px system-ui, sans-serif';
  ctx.fillStyle = '#3d4f3d';

  if (input.remMinutes != null) {
    ctx.fillText(`${input.remMinutes} min REM`, pad, statsY);
  }
  if (input.quality != null) {
    ctx.fillText(`${input.quality}% sleep quality`, pad, statsY + 52);
  }

  const bedtime = formatTime(input.bedtime);
  const wakeTime = formatTime(input.wakeTime);
  if (bedtime && wakeTime) {
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillStyle = '#5a6e5a';
    ctx.fillText(`${bedtime} → ${wakeTime}`, pad, statsY + 120);
  }

  ctx.font = 'italic 34px Georgia, serif';
  ctx.fillStyle = '#4a5d4a';
  wrapText(ctx, 'Rest is part of the dream journey.', pad, 720, w - pad * 2, 46);

  drawEverdreamWatermark(ctx);
  return canvasToBlob(ctx.canvas);
}

export async function generateDreamCard(input: DreamCardInput): Promise<Blob> {
  const ctx = createStoryCanvas();
  const w = STORY_WIDTH;
  const h = STORY_HEIGHT;
  const pad = 72;
  const text = (input.nugget || input.content || 'A dream remembered…').trim();

  let textStartY = 520;

  if (input.imageUrl) {
    const img = await loadImage(input.imageUrl);
    if (img) {
      const heroH = Math.floor(h * 0.52);
      ctx.drawImage(img, 0, 0, w, heroH);
      const overlay = ctx.createLinearGradient(0, heroH * 0.55, 0, heroH + 120);
      overlay.addColorStop(0, 'rgba(45, 58, 45, 0.05)');
      overlay.addColorStop(1, 'rgba(45, 58, 45, 0.92)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, w, heroH + 120);
      textStartY = heroH + 80;
    } else {
      drawSageBackground(ctx);
    }
  } else {
    drawSageBackground(ctx);
    ctx.font = '100px system-ui, sans-serif';
    ctx.fillText('🌙', pad, 200);
    textStartY = 340;
  }

  ctx.fillStyle = '#f4f7f2';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('DREAM JOURNAL', pad, input.imageUrl ? textStartY - 100 : 300);

  ctx.fillStyle = input.imageUrl ? '#f4f7f2' : '#2d3a2d';
  ctx.font = 'bold 44px Georgia, serif';
  const bodyEnd = wrapText(ctx, text, pad, textStartY, w - pad * 2, 54, 8);

  const dateStr = new Date(input.date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillStyle = input.imageUrl ? 'rgba(244,247,242,0.85)' : '#5a6e5a';
  ctx.fillText(dateStr, pad, bodyEnd + 20);

  if (input.emotion) {
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText(`✨ ${input.emotion}`, pad, bodyEnd + 64);
  }

  if (!input.imageUrl) drawEverdreamWatermark(ctx);
  else {
    ctx.fillStyle = 'rgba(35, 48, 35, 0.95)';
    ctx.fillRect(0, h - 160, w, 160);
    ctx.fillStyle = '#f4f7f2';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText('EverDream', pad, h - 82);
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(232, 240, 230, 0.85)';
    ctx.fillText('everdream.app', pad, h - 38);
    ctx.font = '40px system-ui, sans-serif';
    ctx.fillText('🌙', w - 110, h - 62);
  }

  return canvasToBlob(ctx.canvas);
}

export async function generateShareCard(
  kind: ShareCardKind,
  input: ReflectionCardInput | SleepCardInput | DreamCardInput,
): Promise<Blob> {
  switch (kind) {
    case 'reflection':
      return generateReflectionCard(input as ReflectionCardInput);
    case 'sleep':
      return generateSleepCard(input as SleepCardInput);
    case 'dream':
      return generateDreamCard(input as DreamCardInput);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create image'))),
      'image/png',
    );
  });
}

export function blobToPreviewUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export async function shareImageBlob(
  blob: Blob,
  filename: string,
  title: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });

  const canShareFiles =
    typeof navigator.share === 'function' &&
    (!navigator.canShare || navigator.canShare({ files: [file] }));

  if (canShareFiles) {
    try {
      await navigator.share({
        files: [file],
        title,
        text: 'Shared from EverDream',
      });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}

export async function shareCard(
  kind: ShareCardKind,
  input: ReflectionCardInput | SleepCardInput | DreamCardInput,
): Promise<'shared' | 'downloaded'> {
  const blob = await generateShareCard(kind, input);
  const date = new Date().toISOString().split('T')[0];
  const filename = `everdream-${kind}-${date}.png`;
  const titles: Record<ShareCardKind, string> = {
    reflection: 'My Morning Reflection',
    sleep: "Last Night's Sleep",
    dream: 'My Dream',
  };
  return shareImageBlob(blob, filename, titles[kind]);
}