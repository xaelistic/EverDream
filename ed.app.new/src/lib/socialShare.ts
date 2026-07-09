export const SOCIAL_INTEGRATIONS_KEY = 'everdream_social_integrations';

export type SocialProviderId =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'twitter'
  | 'whatsapp'
  | 'line'
  | 'spotify'
  | 'meta';

export interface ShareableDream {
  id: string;
  title?: string;
  content: string;
  mood?: string;
  category?: string;
  date: string;
  imageUrl?: string;
  nugget?: string;
  generatedImage?: { url?: string };
  emotion?: string;
  symbols?: string[];
}

export interface SharePayload {
  title: string;
  text: string;
  url: string;
  imageUrl?: string;
}

export interface SocialIntegrationStatus {
  [platformId: string]: boolean;
}

export function getDreamImageUrl(dream: ShareableDream): string | undefined {
  return dream.imageUrl || dream.generatedImage?.url;
}

export function buildSharePayload(dream: ShareableDream): SharePayload {
  const snippet = dream.nugget || dream.content.substring(0, 120);
  return {
    title: dream.title || 'My dream',
    text: `"${snippet}" — From my EverDream journal 🌙`,
    url: typeof window !== 'undefined' ? window.location.href : 'https://everdream.app',
    imageUrl: getDreamImageUrl(dream),
  };
}

export function toShareableDream(dream: Record<string, unknown>): ShareableDream {
  const generatedImage = dream.generatedImage as { url?: string } | undefined;
  return {
    id: String(dream.id ?? ''),
    title: typeof dream.title === 'string' ? dream.title : undefined,
    content: String(dream.content ?? ''),
    mood: typeof dream.mood === 'string' ? dream.mood : undefined,
    category: typeof dream.category === 'string' ? dream.category : undefined,
    date: String(dream.date ?? new Date().toISOString()),
    imageUrl: typeof dream.imageUrl === 'string' ? dream.imageUrl : generatedImage?.url,
    nugget: typeof dream.nugget === 'string' ? dream.nugget : undefined,
    generatedImage,
    emotion: typeof dream.emotion === 'string' ? dream.emotion : undefined,
    symbols: Array.isArray(dream.symbols) ? dream.symbols.map(String) : undefined,
  };
}

export function getLinkedProviders(): SocialIntegrationStatus {
  try {
    const stored = localStorage.getItem(SOCIAL_INTEGRATIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function setProviderLinked(providerId: string, linked: boolean): SocialIntegrationStatus {
  const next = { ...getLinkedProviders(), [providerId]: linked };
  try {
    localStorage.setItem(SOCIAL_INTEGRATIONS_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('Failed to save social integrations:', e);
  }
  return next;
}

export function isProviderLinked(providerId: string): boolean {
  return !!getLinkedProviders()[providerId];
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

export function shareToWhatsApp(payload: SharePayload): void {
  const message = encodeURIComponent(`${payload.text}\n${payload.url}`);
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  const base = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
  window.open(`${base}?text=${message}`, '_blank', 'noopener,noreferrer');
}

export function shareToLine(payload: SharePayload): void {
  const message = encodeURIComponent(`${payload.text}\n${payload.url}`);
  window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(payload.url)}&text=${message}`, '_blank', 'noopener,noreferrer');
}

export async function shareToInstagram(payload: SharePayload): Promise<void> {
  await copyToClipboard(payload.text);
  if (payload.imageUrl) {
    await downloadDreamImage(payload.imageUrl, 'everdream-story');
  }
}

export async function shareToTikTok(payload: SharePayload): Promise<void> {
  await copyToClipboard(payload.text);
  if (payload.imageUrl) {
    await downloadDreamImage(payload.imageUrl, 'everdream-tiktok');
  }
}

export async function downloadDreamImage(imageUrl: string, basename = 'everdream-dream'): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${basename}.jpg`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch {
    window.open(imageUrl, '_blank');
  }
}

export async function generateShareCardImage(dream: ShareableDream): Promise<void> {
  const canvas = document.createElement('canvas');
  const size = 1080;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageUrl = getDreamImageUrl(dream);
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, '#1e1b4b');
  grad.addColorStop(1, '#312e81');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const hasImage = !!imageUrl;
  if (hasImage && imageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size * 0.75);
        const overlay = ctx.createLinearGradient(0, size * 0.55, 0, size);
        overlay.addColorStop(0, 'rgba(15,23,42,0.1)');
        overlay.addColorStop(1, 'rgba(15,23,42,0.95)');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, size, size);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = imageUrl;
    });
  }

  ctx.fillStyle = hasImage ? '#e0e7ff' : '#c4b5fd';
  ctx.font = 'bold 38px system-ui, sans-serif';
  ctx.fillText('EVERDREAM', 70, 85);
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillStyle = hasImage ? '#c7d2fe' : '#a5b4fc';
  ctx.fillText('🌙 Dream Journal', 70, 120);

  const nugget = dream.nugget || dream.content || 'A dream remembered...';
  ctx.fillStyle = '#f1e7ff';
  ctx.font = 'bold 48px Georgia, serif';

  const maxWidth = 860;
  const lineHeight = 62;
  let y = hasImage ? 620 : 380;
  const words = nugget.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = `${line}${words[n]} `;
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, 70, y);
      line = `${words[n]} `;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 70, y);

  ctx.fillStyle = hasImage ? '#e0e7ff' : '#c4b5fd';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText(new Date(dream.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), 70, y + 55);

  if (dream.emotion) {
    ctx.fillStyle = 'rgba(167, 139, 250, 0.25)';
    ctx.fillRect(70, y + 70, 260, 42);
    ctx.fillStyle = '#e0e7ff';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText(`✨ ${dream.emotion}`, 82, y + 98);
  }

  ctx.fillStyle = '#64748b';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('EverDream • Yours forever', 70, size - 70);

  const link = document.createElement('a');
  link.download = `everdream-${dream.date}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// OAuth connect/disconnect: see src/lib/auth/socialAuth.ts and src/lib/social/shareService.ts