import { useCallback, useEffect, useState } from 'react';
import { X, Share2, Loader2, Moon, Sparkles, BedDouble } from 'lucide-react';
import {
  type ShareCardKind,
  type ReflectionCardInput,
  type SleepCardInput,
  type DreamCardInput,
  generateShareCard,
  shareImageBlob,
  blobToPreviewUrl,
} from '../../lib/shareCard';

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  reflection: ReflectionCardInput;
  sleep: SleepCardInput | null;
  dream: DreamCardInput | null;
}

const KIND_META: Record<
  ShareCardKind,
  { label: string; description: string; icon: typeof Moon }
> = {
  reflection: {
    label: 'Reflection',
    description: 'Mood, energy & quote',
    icon: Sparkles,
  },
  sleep: {
    label: 'Sleep',
    description: 'Duration, REM & quality',
    icon: BedDouble,
  },
  dream: {
    label: 'Dream',
    description: 'Your latest journal entry',
    icon: Moon,
  },
};

export function ShareSheet({ open, onClose, reflection, sleep, dream }: ShareSheetProps) {
  const [selected, setSelected] = useState<ShareCardKind>('reflection');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const availability: Record<ShareCardKind, boolean> = {
    reflection: true,
    sleep: sleep != null,
    dream: dream != null,
  };

  const getInput = useCallback(
    (kind: ShareCardKind): ReflectionCardInput | SleepCardInput | DreamCardInput | null => {
      if (kind === 'reflection') return reflection;
      if (kind === 'sleep') return sleep;
      if (kind === 'dream') return dream;
      return null;
    },
    [reflection, sleep, dream],
  );

  useEffect(() => {
    if (!open) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewBlob(null);
      setStatus(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (!availability[selected]) {
      const fallback = (['reflection', 'sleep', 'dream'] as ShareCardKind[]).find(
        (k) => availability[k],
      );
      if (fallback) setSelected(fallback);
    }
  }, [open, availability, selected]);

  useEffect(() => {
    if (!open || !availability[selected]) return;

    let cancelled = false;
    const input = getInput(selected);
    if (!input) return;

    setLoading(true);
    setStatus(null);

    generateShareCard(selected, input)
      .then((blob) => {
        if (cancelled) return;
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return blobToPreviewUrl(blob);
        });
        setPreviewBlob(blob);
      })
      .catch(() => {
        if (!cancelled) setStatus('Could not generate preview.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selected, availability, getInput]);

  const handleShare = async () => {
    if (!previewBlob) return;
    setSharing(true);
    setStatus(null);
    try {
      const date = new Date().toISOString().split('T')[0];
      const result = await shareImageBlob(
        previewBlob,
        `everdream-${selected}-${date}.png`,
        KIND_META[selected].label,
      );
      setStatus(result === 'shared' ? 'Opened share menu.' : 'Saved to downloads.');
      if (result === 'shared') {
        setTimeout(onClose, 600);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setStatus('Share failed. Try again.');
      }
    } finally {
      setSharing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close share"
      />

      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] border border-line bg-cream shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-line bg-cream/95 backdrop-blur-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Share</p>
            <h3 className="font-serif text-xl text-ink">Choose what to share</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-parchment text-muted"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {(['reflection', 'sleep', 'dream'] as ShareCardKind[]).map((kind) => {
              const meta = KIND_META[kind];
              const Icon = meta.icon;
              const enabled = availability[kind];
              const active = selected === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  disabled={!enabled}
                  onClick={() => enabled && setSelected(kind)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? 'border-sage bg-sage/10 ring-2 ring-sage/30'
                      : 'border-line bg-parchment hover:border-sage/30'
                  } ${!enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${active ? 'text-sageDark' : 'text-muted'}`} />
                  <div className="text-sm font-semibold text-ink">{meta.label}</div>
                  <div className="text-[10px] text-muted mt-0.5 leading-snug">{meta.description}</div>
                </button>
              );
            })}
          </div>

          <div className="rounded-[1.75rem] border border-line bg-parchment p-3 shadow-paper">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-2 text-center">
              Full-screen preview
            </p>
            <div className="mx-auto w-full max-w-[220px] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-sage/20 bg-sage/5 relative">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-cream/80">
                  <Loader2 className="w-8 h-8 text-sage animate-spin" />
                </div>
              )}
              {previewUrl && !loading && (
                <img
                  src={previewUrl}
                  alt="Share preview"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          {status && (
            <p className="text-center text-sm text-sageDark">{status}</p>
          )}

          <button
            type="button"
            onClick={handleShare}
            disabled={sharing || loading || !previewBlob}
            className="w-full bg-sage hover:bg-sageDark text-cream rounded-2xl py-4 font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sharing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}
            Share
          </button>

          <p className="text-center text-[11px] text-muted leading-relaxed px-2">
            Opens your device share menu (Instagram, Messages, etc.). Card includes EverDream watermark.
          </p>
        </div>
      </div>
    </div>
  );
}