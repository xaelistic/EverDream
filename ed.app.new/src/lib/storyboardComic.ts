/**
 * Assemble storyboard comic pages in code so captions stay readable.
 * Image models do not draw the panel text — they only paint the scene stills.
 */

const PANEL = '#1b221c';
const CREAM = '#f4f7f2';
const CREAM_DIM = 'rgba(232, 240, 230, 0.78)';
const INK = '#f4f7f2';

export interface ComicPanel {
  url: string;
  title: string;
  caption: string;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load storyboard still'));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to create comic'))), type, quality);
  });
}

function roundedRect(
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

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): void {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  let used = 0;
  for (const word of words) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, cy);
      line = `${word} `;
      cy += lineHeight;
      used += 1;
      if (used >= maxLines) return;
    } else {
      line = test;
    }
  }
  if (line && used < maxLines) ctx.fillText(line.trim(), x, cy);
}

function cover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  roundedRect(ctx, x, y, w, h, 18);
  ctx.clip();
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

export function storyboardPanelPrompt(sceneText: string): string {
  return [
    sceneText.trim(),
    'Single cinematic still of this one dream moment',
    'rich atmosphere, consistent characters and lighting',
    'no captions, no titles, no speech bubbles, no subtitles',
    'no watermarks, no UI, no letters, no typography overlay',
  ].join('. ');
}

/** Caption a single still so the grid is a comic, not raw AI lettering. */
export async function captionStoryboardPanel(panel: ComicPanel, width = 1080, height = 1350): Promise<Blob> {
  const img = await loadImage(panel.url);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, width, height);

  const pad = 36;
  const captionH = 210;
  cover(ctx, img, pad, pad, width - pad * 2, height - captionH - pad);

  ctx.fillStyle = CREAM_DIM;
  ctx.font = '600 28px system-ui, sans-serif';
  ctx.fillText(panel.title.toUpperCase(), pad + 8, height - captionH + 48);

  ctx.fillStyle = INK;
  ctx.font = 'italic 36px Georgia, serif';
  wrap(ctx, panel.caption, pad + 8, height - captionH + 100, width - pad * 2 - 16, 44, 2);

  return canvasToBlob(ctx.canvas);
}

/** One branded comic page: 2 or 3 panels stacked, captions drawn in code. */
export async function assembleStoryboardComic(
  panels: ComicPanel[],
  meta: { title?: string } = {},
): Promise<Blob> {
  const count = Math.min(3, Math.max(2, panels.length));
  const width = 1080;
  const headerH = 150;
  const footerH = 120;
  const gap = 22;
  const pad = 40;
  const panelH = count === 3 ? 520 : 720;
  const captionH = 96;
  const height = headerH + footerH + count * (panelH + captionH + gap) + pad;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#121812');
  grad.addColorStop(1, '#1b221c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = CREAM_DIM;
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText('EVERDREAM  ·  DREAM STORYBOARD', pad, 58);

  ctx.fillStyle = CREAM;
  ctx.font = 'bold 42px Georgia, serif';
  const heading = (meta.title || 'A dream in panels').replace(/^["“]+|["”]+$/g, '');
  ctx.fillText(heading.length > 42 ? `${heading.slice(0, 39).trim()}…` : heading, pad, 112);

  const images = await Promise.all(panels.slice(0, count).map((p) => loadImage(p.url)));
  let y = headerH;
  images.forEach((img, index) => {
    const panel = panels[index];
    cover(ctx, img, pad, y, width - pad * 2, panelH);
    y += panelH + 14;
    ctx.fillStyle = CREAM_DIM;
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText(`${index + 1}  ·  ${panel.title.toUpperCase()}`, pad + 4, y + 28);
    ctx.fillStyle = CREAM;
    ctx.font = 'italic 28px Georgia, serif';
    wrap(ctx, panel.caption, pad + 4, y + 66, width - pad * 2, 34, 2);
    y += captionH + gap;
  });

  ctx.fillStyle = CREAM;
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillText('EverDream', pad, height - 48);
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillStyle = CREAM_DIM;
  ctx.fillText('everdream.app', pad + 170, height - 48);
  ctx.font = '32px system-ui, sans-serif';
  ctx.fillText('🌙', width - pad - 36, height - 44);

  return canvasToBlob(ctx.canvas);
}
