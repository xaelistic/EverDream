import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { supabase } from '../supabase/client';
import { signInWithSocialProvider, startTikTokOAuth } from '../auth/socialAuth';
import { fetchLinkedSocialAccounts, isProviderLinkedInDb } from './socialAccounts';
import type { SocialProviderId } from '../socialShare';

export type { ShareableDream, SharePayload, SocialProviderId } from '../socialShare';
export {
  buildSharePayload,
  getDreamImageUrl,
  toShareableDream,
  copyToClipboard,
  downloadDreamImage,
  generateShareCardImage,
} from '../socialShare';

export interface ShareResult {
  ok: boolean;
  method: 'api' | 'dialog' | 'native' | 'download' | 'fallback';
  message?: string;
  postUrl?: string;
}

export function canNativeShare(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return true;
  return typeof navigator.share === 'function';
}

async function blobFromImageUrl(imageUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

export async function shareNative(payload: import('../socialShare').SharePayload): Promise<ShareResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
        dialogTitle: 'Share your dream',
      });
      await logShareEvent(payload, 'native', 'published');
      return { ok: true, method: 'native' };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.toLowerCase().includes('cancel')) {
        return { ok: false, method: 'native', message: 'Cancelled' };
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const shareData: ShareData = { title: payload.title, text: payload.text, url: payload.url };
      if (payload.imageUrl && navigator.canShare) {
        const blob = await blobFromImageUrl(payload.imageUrl);
        if (blob) {
          const file = new File([blob], 'everdream-dream.jpg', { type: blob.type || 'image/jpeg' });
          const withFiles = { ...shareData, files: [file] };
          if (navigator.canShare(withFiles)) {
            await navigator.share(withFiles);
            await logShareEvent(payload, 'native', 'published');
            return { ok: true, method: 'native' };
          }
        }
      }
      await navigator.share(shareData);
      await logShareEvent(payload, 'native', 'published');
      return { ok: true, method: 'native' };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.toLowerCase().includes('cancel')) {
        return { ok: false, method: 'native', message: 'Cancelled' };
      }
    }
  }

  const { copyToClipboard } = await import('../socialShare');
  await copyToClipboard(`${payload.text}\n${payload.url}`);
  return { ok: true, method: 'fallback', message: 'Copied to clipboard' };
}

export async function createPublicShareLink(
  dream: import('../socialShare').ShareableDream,
  payload: import('../socialShare').SharePayload,
): Promise<{ ok: boolean; url?: string; message?: string }> {
  const { data, error } = await supabase.functions.invoke('share-link', {
    body: {
      dreamId: dream.id,
      caption: payload.text,
      ogTitle: payload.title,
      ogDescription: payload.text,
      ogImageUrl: payload.imageUrl,
    },
  });

  if (error) return { ok: false, message: error.message };
  if (!data?.publicUrl) return { ok: false, message: data?.error || 'Share link not created' };
  return { ok: true, url: data.publicUrl };
}

export async function publishViaApi(
  provider: 'facebook' | 'instagram' | 'tiktok',
  dream: import('../socialShare').ShareableDream,
  payload: import('../socialShare').SharePayload,
  shareUrl?: string,
): Promise<ShareResult> {
  const { data, error } = await supabase.functions.invoke('social-publish', {
    body: {
      provider,
      dreamId: dream.id,
      caption: payload.text,
      imageUrl: payload.imageUrl,
      shareUrl: shareUrl || payload.url,
      title: payload.title,
    },
  });

  if (error) {
    await logShareEvent(payload, 'api', 'failed', provider, error.message);
    return { ok: false, method: 'api', message: error.message };
  }

  if (data?.published) {
    await logShareEvent(payload, 'api', 'published', provider, undefined, data);
    return { ok: true, method: 'api', postUrl: data.postUrl, message: data.message };
  }

  if (data?.fallback === 'dialog' && data?.dialogUrl) {
    window.open(data.dialogUrl, '_blank', 'noopener,noreferrer');
    await logShareEvent(payload, 'dialog', 'published', provider);
    return { ok: true, method: 'dialog', postUrl: data.dialogUrl };
  }

  await logShareEvent(payload, 'api', 'failed', provider, data?.error);
  return { ok: false, method: 'api', message: data?.error || 'Publish failed' };
}

export async function shareToPlatform(
  providerId: SocialProviderId,
  dream: import('../socialShare').ShareableDream,
  payload: import('../socialShare').SharePayload,
): Promise<ShareResult> {
  const accounts = await fetchLinkedSocialAccounts();
  const linked = isProviderLinkedInDb(accounts, providerId);

  let publicUrl = payload.url;
  const linkResult = await createPublicShareLink(dream, payload);
  if (linkResult.ok && linkResult.url) {
    publicUrl = linkResult.url;
    payload = { ...payload, url: publicUrl };
  }

  switch (providerId) {
    case 'facebook':
    case 'meta': {
      if (linked) {
        const api = await publishViaApi('facebook', dream, payload, publicUrl);
        if (api.ok) return api;
      }
      const quote = encodeURIComponent(payload.text);
      const url = encodeURIComponent(publicUrl);
      const dialogUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`;
      window.open(dialogUrl, '_blank', 'noopener,noreferrer');
      await logShareEvent(payload, 'dialog', 'published', 'facebook');
      return { ok: true, method: 'dialog', postUrl: dialogUrl };
    }

    case 'instagram': {
      if (linked && payload.imageUrl) {
        const api = await publishViaApi('instagram', dream, payload, publicUrl);
        if (api.ok) return api;
      }
      const { copyToClipboard, shareToInstagram } = await import('../socialShare');
      await shareToInstagram(payload);
      await logShareEvent(payload, 'download', 'published', 'instagram');
      return { ok: true, method: 'download', message: 'Caption copied and image saved — open Instagram to post.' };
    }

    case 'tiktok': {
      if (linked && payload.imageUrl) {
        const api = await publishViaApi('tiktok', dream, payload, publicUrl);
        if (api.ok) return api;
      }
      const { shareToTikTok } = await import('../socialShare');
      await shareToTikTok(payload);
      await logShareEvent(payload, 'download', 'published', 'tiktok');
      return { ok: true, method: 'download', message: 'Caption copied and image saved — open TikTok to post.' };
    }

    case 'twitter': {
      const text = encodeURIComponent(`${payload.text} ${publicUrl}`);
      const dialogUrl = `https://twitter.com/intent/tweet?text=${text}`;
      window.open(dialogUrl, '_blank', 'noopener,noreferrer');
      await logShareEvent(payload, 'dialog', 'published', 'twitter');
      return { ok: true, method: 'dialog', postUrl: dialogUrl };
    }

    case 'whatsapp': {
      const { shareToWhatsApp } = await import('../socialShare');
      shareToWhatsApp({ ...payload, url: publicUrl });
      await logShareEvent(payload, 'dialog', 'published', 'whatsapp');
      return { ok: true, method: 'dialog' };
    }

    case 'line': {
      const { shareToLine } = await import('../socialShare');
      shareToLine({ ...payload, url: publicUrl });
      await logShareEvent(payload, 'dialog', 'published', 'line');
      return { ok: true, method: 'dialog' };
    }

    default:
      return shareNative({ ...payload, url: publicUrl });
  }
}

export async function connectSocialProvider(
  providerId: SocialProviderId,
): Promise<{ ok: boolean; message?: string }> {
  if (providerId === 'tiktok') {
    const result = await startTikTokOAuth('link');
    if (!result.ok || !result.url) return { ok: false, message: result.message };
    window.location.href = result.url;
    return { ok: true };
  }

  const oauthProvider = providerId === 'meta' ? 'meta' : providerId;
  if (['google', 'facebook', 'meta', 'apple'].includes(oauthProvider)) {
    return signInWithSocialProvider(
      oauthProvider as 'google' | 'facebook' | 'meta' | 'apple',
      'link',
    );
  }

  const { setProviderLinked } = await import('../socialShare');
  setProviderLinked(providerId, true);
  return { ok: true, message: `${providerId} marked ready for device sharing.` };
}

export async function disconnectSocialProvider(providerId: SocialProviderId): Promise<void> {
  const { unlinkSocialAccount } = await import('./socialAccounts');
  await unlinkSocialAccount(providerId);
  const { setProviderLinked } = await import('../socialShare');
  setProviderLinked(providerId, false);
  if (providerId === 'meta') setProviderLinked('facebook', false);
  if (providerId === 'facebook') setProviderLinked('meta', false);
}

async function logShareEvent(
  payload: import('../socialShare').SharePayload,
  shareType: string,
  status: string,
  provider = 'unknown',
  errorMessage?: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  try {
    const { getProfile } = await import('../supabase/client');
    const profile = await getProfile();
    await supabase.from('dream_share_events').insert({
      user_id: profile?.id,
      dream_id: extra?.dreamId as string | undefined,
      provider,
      share_type: shareType,
      status,
      error_message: errorMessage,
      payload: { text: payload.text, url: payload.url, ...extra },
    });
  } catch {
    // non-blocking
  }
}