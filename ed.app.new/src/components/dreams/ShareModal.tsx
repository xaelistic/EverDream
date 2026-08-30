import { useCallback, useEffect, useState } from 'react';
import { X, Share2, Link2, Loader2, Instagram, Facebook, MessageCircle } from 'lucide-react';
import type { Dream } from './DreamList';
import { getEmotionEmoji } from '../../utils/dreamPresentation';
import { presentDream } from '../../lib/dreamClassify';
import {
  buildSharePayload,
  copyToClipboard,
  getDreamImageUrl,
  toShareableDream,
  shareNative,
  createPublicShareLink,
  type ShareableDream,
} from '../../lib/social/shareService';
import {
  dreamToShareInput,
  generateDreamCard,
  shareImageBlob,
  shareVideoBlob,
  blobToPreviewUrl,
  blobToDataUrl,
  SHARE_FORMATS,
  type ShareCardFormat,
} from '../../lib/shareCard';
import { assembleStoryboardComic } from '../../lib/storyboardComic';

type ShareAssetKind = 'still' | 'storyboard' | 'video';

export interface ShareModalProps {
  dream: Dream | ShareableDream | Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
  onShared?: () => void;
}

const CHANNELS: Array<{
  id: ShareCardFormat;
  label: string;
  icon: typeof Instagram;
}> = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'story', label: 'Story', icon: Instagram },
  { id: 'feed', label: 'Facebook', icon: Facebook },
  { id: 'link', label: 'Link', icon: Link2 },
];

export default function ShareModal({ dream, isOpen, onClose, onShared }: ShareModalProps) {
  const [format, setFormat] = useState<ShareCardFormat>('whatsapp');
  const [assetKind, setAssetKind] = useState<ShareAssetKind>('still');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const shareable = dream
    ? ('content' in dream && typeof dream.content === 'string'
        ? (dream as ShareableDream)
        : toShareableDream(dream as Record<string, unknown>))
    : null;

  const presented = shareable
    ? presentDream({
        title: shareable.title,
        nugget: shareable.nugget,
        content: shareable.content,
        category: shareable.category,
        emotion: shareable.emotion || shareable.mood,
        date: shareable.date,
      })
    : null;

  const payload = shareable
    ? {
        ...buildSharePayload(shareable),
        title: presented?.title || shareable.title || 'My dream',
      }
    : null;
  const imageUrl = shareable ? getDreamImageUrl(shareable) : null;
  const spec = SHARE_FORMATS[format];
  const raw = (dream || {}) as Record<string, unknown>;
  const storyboardComicUrl = typeof raw.storyboardComicUrl === 'string' ? raw.storyboardComicUrl : '';
  const storyboardImages = Array.isArray(raw.storyboardImages)
    ? (raw.storyboardImages as Array<{ url?: string; stillUrl?: string; title?: string; caption?: string; prompt?: string }>)
    : [];
  const clipUrl = typeof raw.parallaxVideoUrl === 'string' ? raw.parallaxVideoUrl : '';
  const hasStoryboard = Boolean(storyboardComicUrl || storyboardImages.length);
  const hasClip = Boolean(clipUrl);

  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewBlob(null);
      setStatus(null);
      setFormat('whatsapp');
      setAssetKind('still');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !shareable) return;

    let cancelled = false;
    setLoading(true);
    setStatus(null);

    const input = dreamToShareInput({
      title: presented?.title || shareable.title,
      nugget: shareable.nugget,
      content: shareable.content,
      emotion: presented?.emotion || shareable.emotion || shareable.mood,
      category: presented?.category || shareable.category,
      date: shareable.date,
      generatedImage: imageUrl ? { url: imageUrl } : undefined,
    });

    const build = async (): Promise<Blob> => {
      if (assetKind === 'video') {
        const response = await fetch(clipUrl);
        if (!response.ok) throw new Error('Could not load clip');
        return response.blob();
      }
      if (assetKind === 'storyboard') {
        if (storyboardComicUrl) {
          const response = await fetch(storyboardComicUrl);
          if (response.ok) return response.blob();
        }
        return assembleStoryboardComic(
          storyboardImages.map((frame, index) => ({
            url: frame.stillUrl || frame.url || '',
            title: frame.title || `Scene ${index + 1}`,
            caption: frame.caption || frame.prompt || frame.title || '',
          })).filter((frame) => frame.url),
          { title: presented?.title || shareable.title },
        );
      }
      return generateDreamCard(input, format);
    };

    build()
      .then((blob) => {
        if (cancelled) return;
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return blobToPreviewUrl(blob);
        });
        setPreviewBlob(blob);
      })
      .catch(() => {
        if (!cancelled) setStatus('Could not prepare the share card.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, shareable, imageUrl, format, assetKind, clipUrl, storyboardComicUrl, presented?.title, presented?.emotion, presented?.category]);

  const handleShareVia = useCallback(async () => {
    if (!shareable || !payload) return;

    setSharing(true);
    setStatus(null);

    try {
      if (previewBlob) {
        const date = new Date(shareable.date).toISOString().split('T')[0];
        const title = presented?.title || shareable.title || 'My Dream';
        if (assetKind === 'video') {
          const result = await shareVideoBlob(previewBlob, `everdream-clip-${date}.mp4`, title);
          setStatus(result === 'shared' ? 'Choose an app — branded clip from EverDream.' : 'Saved the clip — share from your gallery.');
          onShared?.();
          if (result === 'shared') setTimeout(onClose, 500);
          return;
        }
        const ext = previewBlob.type.includes('jpeg') || previewBlob.type.includes('jpg') ? 'jpg' : 'png';
        const kind = assetKind === 'storyboard' ? 'storyboard' : format;
        const result = await shareImageBlob(
          previewBlob,
          `everdream-${kind}-${date}.${ext}`,
          title,
        );
        setStatus(
          result === 'shared'
            ? format === 'whatsapp'
              ? 'Choose WhatsApp — 4:5 card with a solid caption panel.'
              : format === 'feed'
                ? 'Choose Facebook or another app. 1:1 card with heading.'
                : 'Choose an app — story card with a solid caption panel.'
            : 'Saved — share from your gallery.',
        );
        onShared?.();
        if (result === 'shared') setTimeout(onClose, 500);
        return;
      }

      const result = await shareNative(payload);
      if (result.ok) {
        onShared?.();
        if (result.method === 'native') setTimeout(onClose, 500);
        else setStatus(result.message || 'Link copied to clipboard.');
      } else if (result.message) {
        setStatus(result.message);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setStatus('Share cancelled or unavailable.');
      }
    } finally {
      setSharing(false);
    }
  }, [shareable, payload, previewBlob, format, assetKind, presented?.title, onClose, onShared]);

  const handleCopyLink = useCallback(async () => {
    if (!shareable || !payload) return;

    setLinkBusy(true);
    setStatus(null);

    try {
      const input = dreamToShareInput({
        title: presented?.title || shareable.title,
        nugget: shareable.nugget,
        content: shareable.content,
        emotion: presented?.emotion || shareable.emotion || shareable.mood,
        category: presented?.category || shareable.category,
        date: shareable.date,
        generatedImage: imageUrl ? { url: imageUrl } : undefined,
      });
      const linkCard = await generateDreamCard(input, 'link');
      const cardImage = await blobToDataUrl(linkCard);
      const result = await createPublicShareLink(
        { ...shareable, title: presented?.title },
        { ...payload, title: presented?.title || payload.title },
        { cardImage },
      );
      if (result.ok && result.url) {
        await copyToClipboard(result.url);
        setStatus('Public link copied — preview uses a watermarked card, not the raw image.');
        onShared?.();
        return;
      }
      setStatus(result.message || 'Could not create a public link.');
    } catch {
      setStatus('Could not copy link.');
    } finally {
      setLinkBusy(false);
    }
  }, [shareable, payload, presented, imageUrl, onShared]);

  if (!isOpen || !dream || !shareable) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close share"
      />

      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] border border-line bg-cream shadow-2xl"
        role="dialog"
        aria-labelledby="dream-share-title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-line bg-cream/95 backdrop-blur-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Share dream</p>
            <h3 id="dream-share-title" className="font-serif text-xl text-ink line-clamp-1">
              {presented?.title || shareable.nugget || 'Untitled dream'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-parchment text-muted shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {(hasStoryboard || hasClip) && (
            <div className="flex gap-2">
              {([
                { id: 'still' as const, label: 'Still', show: true },
                { id: 'storyboard' as const, label: 'Storyboard', show: hasStoryboard },
                { id: 'video' as const, label: 'Clip', show: hasClip },
              ]).filter((item) => item.show).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAssetKind(item.id)}
                  className={`flex-1 rounded-xl border px-2 py-2 text-xs font-semibold ${
                    assetKind === item.id
                      ? 'border-sage bg-sage/10 text-ink'
                      : 'border-line bg-parchment text-muted'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          {assetKind !== 'video' && (
          <div className="grid grid-cols-2 gap-2">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;
              const active = format === channel.id;
              const meta = SHARE_FORMATS[channel.id];
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setFormat(channel.id)}
                  className={`rounded-2xl border px-2 py-2.5 text-left transition ${
                    active
                      ? 'border-sage bg-sage/10 ring-2 ring-sage/25'
                      : 'border-line bg-parchment hover:border-sage/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1.5 ${active ? 'text-sageDark' : 'text-muted'}`} />
                  <div className="text-xs font-semibold text-ink">{channel.label}</div>
                  <div className="text-[10px] text-muted leading-snug mt-0.5">{meta.hint}</div>
                </button>
              );
            })}
          </div>
          )}

          <div className="rounded-[1.75rem] border border-line bg-parchment p-3 shadow-paper">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-2 text-center">
              {assetKind === 'video' ? 'Clip preview' : assetKind === 'storyboard' ? 'Comic preview' : `${spec.label} preview`}
            </p>
            <div
              className="mx-auto w-full rounded-2xl overflow-hidden border-2 border-sage/20 bg-sage/5 relative"
              style={{
                maxWidth: assetKind === 'video' ? 260 : format === 'story' ? 200 : format === 'link' ? '100%' : 260,
                aspectRatio: assetKind === 'video' ? '1 / 1' : spec.aspect,
              }}
            >
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-cream/80">
                  <Loader2 className="w-8 h-8 text-sage animate-spin" />
                </div>
              )}
              {previewUrl && !loading && assetKind === 'video' ? (
                <video src={previewUrl} controls playsInline className="w-full h-full object-cover bg-ink" />
              ) : previewUrl && !loading ? (
                <img
                  src={previewUrl}
                  alt={`${spec.label} share card`}
                  className="w-full h-full object-cover"
                />
              ) : !loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-dusk/20 via-sage/10 to-moon/30">
                  <span className="text-3xl mb-2">{getEmotionEmoji(presented?.emotion || '') || '🌙'}</span>
                  <p className="text-sm font-serif italic text-ink leading-snug line-clamp-4">
                    &ldquo;{shareable.nugget || shareable.content.substring(0, 120)}&rdquo;
                  </p>
                </div>
              ) : null}
            </div>
            <p className="text-center text-xs text-muted mt-3">
              {assetKind === 'video'
                ? 'Dream clip with EverDream in the share caption'
                : 'Watermarked EverDream card — not the raw file'}
            </p>
          </div>

          <div className="flex items-start justify-center gap-8 px-2">
            <button
              type="button"
              onClick={handleShareVia}
              disabled={sharing || loading}
              className="flex flex-col items-center gap-2 min-w-[72px] disabled:opacity-50"
            >
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-paper border bg-sage text-cream border-sage hover:bg-sageDark">
                {sharing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Share2 className="w-6 h-6" strokeWidth={1.75} />}
              </span>
              <span className="text-[11px] font-medium text-ink text-center leading-tight">
                {assetKind === 'video' ? 'Share clip' : assetKind === 'storyboard' ? 'Share comic' : 'Share card'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={linkBusy}
              className="flex flex-col items-center gap-2 min-w-[72px] disabled:opacity-50"
            >
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-paper border bg-parchment text-ink border-line hover:border-sage/40 hover:bg-cream">
                {linkBusy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Link2 className="w-6 h-6" strokeWidth={1.75} />}
              </span>
              <span className="text-[11px] font-medium text-ink text-center leading-tight">Copy link</span>
            </button>
          </div>

          {status && (
            <p className="text-center text-sm text-sageDark leading-relaxed">{status}</p>
          )}

          <p className="text-center text-[11px] text-muted leading-relaxed px-2">
            {assetKind === 'storyboard'
              ? 'The comic page is assembled in EverDream so captions stay readable, with our mark at the foot.'
              : assetKind === 'video'
                ? 'Shares the short dream clip, not a sliding still. Caption includes EverDream.'
                : 'WhatsApp uses a 4:5 card: image on top, dark caption panel underneath so the title stays readable. Story is 9:16, Facebook is 1:1.'}
          </p>
        </div>
      </div>
    </div>
  );
}
