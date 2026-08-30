import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { logAssetFeedback, type TrackedAssetKind } from '../../lib/generationTracking';

const DOWN_TAGS: Record<TrackedAssetKind, string[]> = {
  still: ['blurry', 'garbled-text', 'wrong-scene', 'off-style'],
  storyboard: ['garbled-text', 'inconsistent', 'wrong-scene', 'blurry'],
  video: ['ken-burns', 'frozen', 'blurry', 'wrong-motion', 'identity-drift'],
};

export function AssetFeedback({
  dreamId,
  jobId,
  assetKind,
  assetUrl,
  model,
}: {
  dreamId?: string;
  jobId?: string | null;
  assetKind: TrackedAssetKind;
  assetUrl?: string;
  model?: string;
}) {
  const [choice, setChoice] = useState<1 | -1 | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async (rating: 1 | -1, nextTags: string[] = tags) => {
    if (busy || saved) return;
    setBusy(true);
    setChoice(rating);
    const ok = await logAssetFeedback({
      dreamId,
      jobId,
      assetKind,
      assetUrl,
      model,
      rating,
      tags: rating === -1 ? nextTags : [],
    });
    setBusy(false);
    if (ok) setSaved(true);
  };

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(next);
    if (choice === -1 && !saved) void submit(-1, next);
  };

  if (saved && choice === 1) {
    return <p className="text-[11px] text-sageDark">Thanks — that helps us route better models.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-muted">How does this look?</p>
        <button
          type="button"
          disabled={busy || saved}
          onClick={() => void submit(1)}
          className={`w-8 h-8 rounded-full border flex items-center justify-center ${
            choice === 1 ? 'border-sage bg-sage/15 text-sageDark' : 'border-line text-muted hover:bg-parchment'
          }`}
          aria-label="Looks good"
        >
          <ThumbsUp className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          disabled={busy || saved}
          onClick={() => void submit(-1, tags)}
          className={`w-8 h-8 rounded-full border flex items-center justify-center ${
            choice === -1 ? 'border-dusk/40 bg-dusk/10 text-duskDeep' : 'border-line text-muted hover:bg-parchment'
          }`}
          aria-label="Needs work"
        >
          <ThumbsDown className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>
      {choice === -1 && !saved && (
        <div className="flex flex-wrap gap-1.5">
          {DOWN_TAGS[assetKind].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`text-[10px] px-2 py-1 rounded-full border ${
                tags.includes(tag)
                  ? 'border-dusk/40 bg-dusk/10 text-duskDeep'
                  : 'border-line text-muted bg-parchment'
              }`}
            >
              {tag.replace('-', ' ')}
            </button>
          ))}
        </div>
      )}
      {saved && choice === -1 && (
        <p className="text-[11px] text-muted">Logged. We’ll route the next clip to a stronger model.</p>
      )}
    </div>
  );
}
