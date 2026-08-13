/**
 * Channel-ready share cards with EverDream watermark.
 * Story = 9:16, Facebook feed = 1:1 with heading, link preview = 1.91:1.
 */

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export type ShareCardKind = 'reflection' | 'sleep' | 'dream';
export type ShareCardFormat = 'story' | 'feed' | 'link';

export const SHARE_FORMATS: Record<
  ShareCardFormat,
  { width: number; height: number; label: string; hint: string; aspect: string }
> = {
  story: {
    width: 1080,
    height: 1920,
    label: 'Story',
    hint: '9:16 · Instagram, TikTok, WhatsApp',
    aspect: '9 / 16',
  },
  feed: {
    width: 1080,
    height: 1080,
    label: 'Facebook',
    hint: '1:1 · feed post with heading',
    aspect: '1 / 1',
  },
  link: {
    width: 1200,
    height: 630,
    label: 'Link',
    hint: '1.91:1 · preview when you share a URL',
    aspect: '1.91 / 1',
  },
};

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
  title?: string;
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
  title?: string;
  nugget?: string;
  content?: string;
  emotion?: string;
  category?: string;
  date: string;
  generatedImage?: { url: string };
}): DreamCardInput {
  return {
    title: dream.title,
    nugget: dream.nugget,
    content: dream.content,
    emotion: dream.emotion,
    category: dream.category,
    date: dream.date,
    imageUrl: dream.generatedImage?.url,
  };
}

function createCanvas(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  return ctx;
}

function createStoryCanvas(): CanvasRenderingContext2D {
  return createCanvas(STORY_WIDTH, STORY_HEIGHT);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 0,
): void {
  ctx.save();
  if (radius > 0) {
    roundedRectPath(ctx, x, y, w, h, radius);
    ctx.clip();
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
  }
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function cardTitle(input: DreamCardInput): string {
  const fromTitle = (input.title || '').replace(/^["“]+|["”]+$/g, '').trim();
  if (fromTitle && !/^audio journal|^video journal|^processing|^untitled/i.test(fromTitle)) {
    return fromTitle.length > 80 ? `${fromTitle.slice(0, 77).trim()}…` : fromTitle;
  }
  const source = (input.nugget || input.content || 'A dream remembered').replace(/\s+/g, ' ').trim();
  const sentence = source.split(/(?<=[.!?])\s+/)[0] || source;
  return sentence.length > 80 ? `${sentence.slice(0, 77).trim()}…` : sentence;
}

function cardQuote(input: DreamCardInput): string {
  const text = (input.nugget || input.content || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'A dream remembered.';
  return text.length > 220 ? `${text.slice(0, 217).trim()}…` : text;
}

function cardDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
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

async function generateStoryDreamCard(input: DreamCardInput, img: HTMLImageElement | null): Promise<Blob> {
  const { width: w, height: h } = SHARE_FORMATS.story;
  const ctx = createCanvas(w, h);
  const pad = 72;
  const title = cardTitle(input);
  const quote = cardQuote(input);

  if (img) {
    drawCover(ctx, img, 0, 0, w, h);
    const wash = ctx.createLinearGradient(0, h * 0.28, 0, h);
    wash.addColorStop(0, 'rgba(28, 36, 30, 0.05)');
    wash.addColorStop(0.45, 'rgba(28, 36, 30, 0.45)');
    wash.addColorStop(1, 'rgba(28, 36, 30, 0.92)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
  } else {
    drawSageBackground(ctx);
  }

  const ink = img ? '#f4f7f2' : '#2d3a2d';
  ctx.fillStyle = img ? 'rgba(244,247,242,0.72)' : '#5a6e5a';
  ctx.font = '600 28px system-ui, sans-serif';
  ctx.fillText('DREAM JOURNAL', pad, 160);

  ctx.fillStyle = ink;
  ctx.font = 'bold 64px Georgia, serif';
  const titleEnd = wrapText(ctx, title, pad, 250, w - pad * 2, 76, 3);

  ctx.font = 'italic 36px Georgia, serif';
  ctx.fillStyle = img ? 'rgba(244,247,242,0.92)' : '#3d4f3d';
  const quoteEnd = wrapText(ctx, `“${quote}”`, pad, titleEnd + 36, w - pad * 2, 48, 5);

  ctx.font = '28px system-ui, sans-serif';
  ctx.fillStyle = img ? 'rgba(244,247,242,0.8)' : '#5a6e5a';
  const meta = [cardDate(input.date), input.category, input.emotion].filter(Boolean).join('  ·  ');
  ctx.fillText(meta, pad, Math.min(quoteEnd + 28, h - 220));

  drawEverdreamWatermark(ctx);
  return canvasToBlob(ctx.canvas, 'image/jpeg', 0.9);
}

async function generateFeedDreamCard(input: DreamCardInput, img: HTMLImageElement | null): Promise<Blob> {
  const { width: w, height: h } = SHARE_FORMATS.feed;
  const ctx = createCanvas(w, h);
  const pad = 64;
  const title = cardTitle(input);
  const quote = cardQuote(input);

  drawSageBackground(ctx);

  ctx.fillStyle = '#5a6e5a';
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillText('EVERDREAM', pad, 78);
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText('🌙  Dream journal', pad + 220, 78);

  ctx.fillStyle = '#2d3a2d';
  ctx.font = 'bold 56px Georgia, serif';
  const titleEnd = wrapText(ctx, title, pad, 150, w - pad * 2, 66, 3);

  ctx.font = '26px system-ui, sans-serif';
  ctx.fillStyle = '#4a5d4a';
  const meta = [cardDate(input.date), input.category, input.emotion].filter(Boolean).join('   ·   ');
  ctx.fillText(meta, pad, titleEnd + 8);

  const frameY = titleEnd + 40;
  const frameH = 460;
  if (img) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    roundedRectPath(ctx, pad - 8, frameY - 8, w - pad * 2 + 16, frameH + 16, 36);
    ctx.fill();
    drawCover(ctx, img, pad, frameY, w - pad * 2, frameH, 28);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    roundedRectPath(ctx, pad, frameY, w - pad * 2, frameH, 28);
    ctx.fill();
    ctx.font = '80px system-ui, sans-serif';
    ctx.fillText('🌙', w / 2 - 40, frameY + frameH / 2 + 20);
  }

  ctx.fillStyle = '#2d3a2d';
  ctx.font = 'italic 34px Georgia, serif';
  wrapText(ctx, `“${quote}”`, pad, frameY + frameH + 70, w - pad * 2, 44, 3);

  drawEverdreamWatermark(ctx);
  return canvasToBlob(ctx.canvas, 'image/jpeg', 0.9);
}

async function generateLinkDreamCard(input: DreamCardInput, img: HTMLImageElement | null): Promise<Blob> {
  const { width: w, height: h } = SHARE_FORMATS.link;
  const ctx = createCanvas(w, h);
  const title = cardTitle(input);
  const quote = cardQuote(input);

  drawSageBackground(ctx);

  const imageW = Math.floor(w * 0.52);
  if (img) {
    drawCover(ctx, img, 0, 0, imageW, h);
    const edge = ctx.createLinearGradient(imageW - 80, 0, imageW, 0);
    edge.addColorStop(0, 'rgba(232, 240, 230, 0)');
    edge.addColorStop(1, 'rgba(232, 240, 230, 1)');
    ctx.fillStyle = edge;
    ctx.fillRect(imageW - 80, 0, 80, h);
  }

  const textX = img ? imageW + 48 : 64;
  const textW = w - textX - 56;

  ctx.fillStyle = '#5a6e5a';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText('EVERDREAM  ·  DREAM JOURNAL', textX, 86);

  ctx.fillStyle = '#2d3a2d';
  ctx.font = 'bold 44px Georgia, serif';
  const titleEnd = wrapText(ctx, title, textX, 160, textW, 52, 3);

  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillStyle = '#3d4f3d';
  wrapText(ctx, `“${quote}”`, textX, titleEnd + 24, textW, 36, 3);

  ctx.font = '22px system-ui, sans-serif';
  ctx.fillStyle = '#5a6e5a';
  const meta = [cardDate(input.date), input.category, input.emotion].filter(Boolean).join('  ·  ');
  ctx.fillText(meta, textX, h - 78);

  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillStyle = '#2d3a2d';
  ctx.fillText('EverDream', w - 200, h - 36);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('🌙', w - 56, h - 36);

  return canvasToBlob(ctx.canvas, 'image/jpeg', 0.9);
}

export async function generateDreamCard(
  input: DreamCardInput,
  format: ShareCardFormat = 'story',
): Promise<Blob> {
  const img = input.imageUrl ? await loadImage(input.imageUrl) : null;
  if (format === 'feed') return generateFeedDreamCard(input, img);
  if (format === 'link') return generateLinkDreamCard(input, img);
  return generateStoryDreamCard(input, img);
}

export async function generateShareCard(
  kind: ShareCardKind,
  input: ReflectionCardInput | SleepCardInput | DreamCardInput,
  format: ShareCardFormat = 'story',
): Promise<Blob> {
  switch (kind) {
    case 'reflection':
      return generateReflectionCard(input as ReflectionCardInput);
    case 'sleep':
      return generateSleepCard(input as SleepCardInput);
    case 'dream':
      return generateDreamCard(input as DreamCardInput, format);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/png',
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create image'))),
      type,
      quality,
    );
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
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
  const type = blob.type || 'image/png';
  const file = new File([blob], filename, { type });

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