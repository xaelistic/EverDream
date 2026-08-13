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
  const { generateDreamCard, dreamToShareInput, shareImageBlob } = await import('./shareCard');
  const blob = await generateDreamCard(
    dreamToShareInput({
      title: dream.title,
      nugget: dream.nugget,
      content: dream.content,
      emotion: dream.emotion || dream.mood,
      category: dream.category,
      date: dream.date,
      generatedImage: getDreamImageUrl(dream) ? { url: getDreamImageUrl(dream)! } : undefined,
    }),
    'feed',
  );
  await shareImageBlob(blob, `everdream-${dream.date}.jpg`, dream.title || 'My dream');
}

// OAuth connect/disconnect: see src/lib/auth/socialAuth.ts and src/lib/social/shareService.ts