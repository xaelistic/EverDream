import { useCallback, useEffect, useState } from 'react';
import { X, Share2, Link2, Loader2 } from 'lucide-react';
import type { Dream } from './DreamList';
import { getEmotionEmoji } from '../../utils/dreamPresentation';
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
  generateShareCard,
  shareImageBlob,
  blobToPreviewUrl,
} from '../../lib/shareCard';

export interface ShareModalProps {
  dream: Dream | ShareableDream | Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
}

type QuickAction = {
  id: 'share' | 'link';
  label: string;
  icon: typeof Share2;
  onClick: () => void;
  disabled?: boolean;
};

export default function ShareModal({ dream, isOpen, onClose }: ShareModalProps) {
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

  const payload = shareable ? buildSharePayload(shareable) : null;
  const imageUrl = shareable ? getDreamImageUrl(shareable) : null;

  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewBlob(null);
      setStatus(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !shareable) return;

    let cancelled = false;
    setLoading(true);
    setStatus(null);

    const input = dreamToShareInput({
      nugget: shareable.nugget,
      content: shareable.content,
      emotion: shareable.emotion || shareable.mood,
      category: shareable.category,
      date: shareable.date,
      generatedImage: imageUrl ? { url: imageUrl } : undefined,
    });

    generateShareCard('dream', input)
      .then((blob) => {
        if (cancelled) return;
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return blobToPreviewUrl(blob);
        });
        setPreviewBlob(blob);
      })
      .catch(() => {
        if (!cancelled) setStatus('Could not prepare share preview.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, shareable, imageUrl]);

  const handleShareVia = useCallback(async () => {
    if (!shareable || !payload) return;

    setSharing(true);
    setStatus(null);

    try {
      if (previewBlob) {
        const date = new Date(shareable.date).toISOString().split('T')[0];
        const result = await shareImageBlob(
          previewBlob,
          `everdream-dream-${date}.png`,
          shareable.title || 'My Dream',
        );
        setStatus(result === 'shared' ? 'Choose an app to share with.' : 'Saved — share from your gallery.');
        if (result === 'shared') {
          setTimeout(onClose, 500);
        }
        return;
      }

      const result = await shareNative(payload);
      if (result.ok) {
        if (result.method === 'native') {
          setTimeout(onClose, 500);
        } else {
          setStatus(result.message || 'Link copied to clipboard.');
        }
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
  }, [shareable, payload, previewBlob, onClose]);

  const handleCopyLink = useCallback(async () => {
    if (!shareable || !payload) return;

    setLinkBusy(true);
    setStatus(null);

    try {
      const result = await createPublicShareLink(shareable, payload);
      if (result.ok && result.url) {
        await copyToClipboard(result.url);
        setStatus('Link copied.');
        return;
      }

      await copyToClipboard(payload.url);
      setStatus(result.message || 'Link copied.');
    } catch {
      setStatus('Could not copy link.');
    } finally {
      setLinkBusy(false);
    }
  }, [shareable, payload]);

  if (!isOpen || !dream || !shareable) return null;

  const quickActions: QuickAction[] = [
    {
      id: 'share',
      label: 'Share via',
      icon: Share2,
      onClick: handleShareVia,
      disabled: sharing || loading,
    },
    {
      id: 'link',
      label: 'Copy link',
      icon: Link2,
      onClick: handleCopyLink,
      disabled: linkBusy,
    },
  ];

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
              {shareable.title || shareable.nugget || 'Untitled dream'}
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
          <div className="rounded-[1.75rem] border border-line bg-parchment p-3 shadow-paper">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-2 text-center">
              Preview
            </p>
            <div className="mx-auto w-full max-w-[220px] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-sage/20 bg-sage/5 relative">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-cream/80">
                  <Loader2 className="w-8 h-8 text-sage animate-spin" />
                </div>
              )}
              {previewUrl && !loading ? (
                <img
                  src={previewUrl}
                  alt="Dream share preview"
                  className="w-full h-full object-cover"
                />
              ) : !loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-dusk/20 via-sage/10 to-moon/30">
                  <span className="text-3xl mb-2">{getEmotionEmoji(shareable.emotion || shareable.mood || '') || '🌙'}</span>
                  <p className="text-sm font-serif italic text-ink leading-snug line-clamp-4">
                    &ldquo;{shareable.nugget || shareable.content.substring(0, 120)}&rdquo;
                  </p>
                </div>
              ) : null}
            </div>
            <p className="text-center text-xs text-muted mt-3">
              {new Date(shareable.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted text-center mb-3">
              Share via
            </p>
            <div className="flex items-start justify-center gap-8 px-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                const busy = action.id === 'share' ? sharing : linkBusy;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className="flex flex-col items-center gap-2 min-w-[72px] disabled:opacity-50"
                  >
                    <span
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-paper border transition ${
                        action.id === 'share'
                          ? 'bg-sage text-cream border-sage hover:bg-sageDark'
                          : 'bg-parchment text-ink border-line hover:border-sage/40 hover:bg-cream'
                      }`}
                    >
                      {busy ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Icon className="w-6 h-6" strokeWidth={1.75} />
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-ink text-center leading-tight">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {status && (
            <p className="text-center text-sm text-sageDark leading-relaxed">{status}</p>
          )}

          <p className="text-center text-[11px] text-muted leading-relaxed px-2">
            Opens your device share menu — Messages, WhatsApp, Instagram, and more.
          </p>
        </div>
      </div>
    </div>
  );
}