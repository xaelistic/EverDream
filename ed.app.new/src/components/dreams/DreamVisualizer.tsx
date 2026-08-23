import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Share2, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { generateDreamImage } from '../../modules/sleep/dreamAssetGenerator';
import type { DreamAsset } from '../../modules/sleep/types';
import { getLastSignalForDream, recordTasteSignal } from '../../lib/imageTaste';
import { DreamProcessingOverlay } from './DreamProcessingOverlay';

interface DreamVisualizerProps {
  dreamId: string;
  dreamText: string;
  dreamTitle?: string;
  existingImageUrl?: string;
  processingStatus?: 'processing' | 'complete' | 'failed';
  processingStep?: 'transcribe' | 'analyse' | 'image' | 'complete';
  onImageGenerated?: (asset: DreamAsset) => void;
  onShare?: () => void;
}

/**
 * Dream image at the top of a dream card, with share / regenerate actions.
 */
export default function DreamVisualizer({
  dreamId,
  dreamText,
  dreamTitle,
  existingImageUrl,
  processingStatus,
  processingStep,
  onImageGenerated,
  onShare,
}: DreamVisualizerProps) {
  const [asset, setAsset] = useState<DreamAsset | null>(
    existingImageUrl
      ? {
          id: `${dreamId}-existing`,
          prompt: dreamText,
          url: existingImageUrl,
          source: 'openrouter',
          style: 'dreamlike',
          generatedAt: new Date().toISOString(),
        }
      : null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(!!existingImageUrl);
  const [tasteVote, setTasteVote] = useState<'like' | 'dislike' | null>(() => {
    const last = getLastSignalForDream(dreamId);
    return last === 'like' || last === 'dislike' ? last : null;
  });

  useEffect(() => {
    if (!existingImageUrl) return;
    setAsset((current) => {
      if (current?.url === existingImageUrl) return current;
      return {
        id: `${dreamId}-existing`,
        prompt: dreamText,
        url: existingImageUrl,
        source: 'openrouter',
        style: 'dreamlike',
        generatedAt: new Date().toISOString(),
      };
    });
    setImageLoaded(true);
  }, [dreamId, dreamText, existingImageUrl]);

  const handleVisualize = useCallback(async () => {
    if (asset?.url) {
      recordTasteSignal('regenerate', {
        dreamId,
        prompt: asset.prompt || dreamText,
        style: asset.style,
        source: asset.source,
      });
    }

    setError(null);
    setIsGenerating(true);
    setImageLoaded(false);

    try {
      const result = await generateDreamImage(dreamText, 'dreamlike');
      setAsset(result);
      setTasteVote(null);
      onImageGenerated?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate image';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [asset, dreamId, dreamText, onImageGenerated]);

  const handleShare = useCallback(() => {
    if (asset?.url) {
      recordTasteSignal('share', {
        dreamId,
        prompt: asset.prompt || dreamText,
        style: asset.style,
        source: asset.source,
      });
    }
    onShare?.();
  }, [asset, dreamId, dreamText, onShare]);

  const handleTasteVote = useCallback((signal: 'like' | 'dislike') => {
    if (!asset?.url) return;
    recordTasteSignal(signal, {
      dreamId,
      prompt: asset.prompt || dreamText,
      style: asset.style,
      source: asset.source,
    });
    setTasteVote(signal);
  }, [asset, dreamId, dreamText]);

  return (
    <div data-component="DreamVisualizer">
      {!asset && !isGenerating && processingStatus !== 'processing' && (
        <div className="px-5 sm:px-6 py-10 text-center border-b border-line bg-parchment/40">
          <p className="text-sm text-muted mb-4 leading-relaxed">
            Create an image of this dream, then share or try another take.
          </p>
          <button
            type="button"
            onClick={handleVisualize}
            className="inline-flex items-center justify-center gap-2 bg-sage hover:bg-sageDark text-cream px-4 py-2.5 rounded-xl text-sm font-medium shadow-paper transition"
          >
            <Sparkles className="w-4 h-4" strokeWidth={1.75} />
            Generate image
          </button>
        </div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 border-b border-line bg-parchment/30">
          <div
            className="w-10 h-10 rounded-full border-2 border-dusk/30 border-t-duskDeep animate-spin"
            aria-hidden
          />
          <p className="text-sm text-muted text-center">
            Painting your dream…
            <span className="block text-xs opacity-70 mt-1">Usually 10–30 seconds</span>
          </p>
        </div>
      )}

      {error && !isGenerating && (
        <div className="mx-5 sm:mx-6 mt-4 rounded-2xl border border-blush/60 bg-blush/20 px-4 py-3 text-center">
          <p className="text-sm text-duskDeep mb-2">{error}</p>
          <button
            type="button"
            onClick={handleVisualize}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-duskDeep"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
            Try again
          </button>
        </div>
      )}

      {asset && !isGenerating && (
        <div className="relative bg-ink/5">
          {!imageLoaded && (
            <div className="flex items-center justify-center h-64 bg-parchment/50">
              <div
                className="w-8 h-8 rounded-full border-2 border-dusk/30 border-t-duskDeep animate-spin"
                aria-hidden
              />
            </div>
          )}
          <img
            src={asset.url}
            alt={dreamTitle ? `Dream image: ${dreamTitle}` : 'Dream image'}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageLoaded(false);
              setAsset(null);
              setError('The image could not be displayed. Try generating again.');
            }}
            className={`w-full max-h-[28rem] object-cover ${imageLoaded ? 'block' : 'hidden'}`}
          />
          {dreamTitle && imageLoaded && processingStatus !== 'processing' && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-5 py-4">
              <h2 className="font-serif text-xl sm:text-2xl text-cream leading-snug">{dreamTitle}</h2>
            </div>
          )}
          {processingStatus === 'processing' && (
            <DreamProcessingOverlay step={processingStep} />
          )}
        </div>
      )}

      {processingStatus === 'processing' && !asset && (
        <div className="relative min-h-[14rem] border-b border-line bg-parchment/40 overflow-hidden">
          <DreamProcessingOverlay step={processingStep} />
        </div>
      )}

      {processingStatus !== 'processing' && (onShare || asset) && (
        <div className="px-5 sm:px-6 pt-4 space-y-2">
          <div className="flex gap-2">
          {onShare && (
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 bg-sage hover:bg-sageDark text-cream py-2.5 rounded-xl transition flex items-center justify-center gap-2 font-medium text-sm shadow-paper"
              aria-label="Share dream"
            >
              <Share2 className="w-4 h-4" strokeWidth={1.75} />
              Share
            </button>
          )}
          {asset && (
              <button
                type="button"
                onClick={handleVisualize}
                disabled={isGenerating}
                className="flex-1 border border-line bg-parchment/70 hover:bg-parchment text-ink py-2.5 rounded-xl transition flex items-center justify-center gap-2 font-medium text-sm disabled:opacity-50"
                aria-label="Regenerate dream image"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                Another look
              </button>
          )}
          </div>
          {asset && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTasteVote('like')}
                className={`flex-1 border py-2.5 rounded-xl transition flex items-center justify-center gap-2 font-medium text-sm ${
                  tasteVote === 'like'
                    ? 'border-sage bg-sage/15 text-sageDark'
                    : 'border-line bg-parchment/70 hover:bg-parchment text-ink'
                }`}
                aria-pressed={tasteVote === 'like'}
                aria-label="I like this image style"
              >
                <ThumbsUp className="w-4 h-4" strokeWidth={1.75} />
                Like this look
              </button>
              <button
                type="button"
                onClick={() => handleTasteVote('dislike')}
                className={`flex-1 border py-2.5 rounded-xl transition flex items-center justify-center gap-2 font-medium text-sm ${
                  tasteVote === 'dislike'
                    ? 'border-blush bg-blush/20 text-duskDeep'
                    : 'border-line bg-parchment/70 hover:bg-parchment text-ink'
                }`}
                aria-pressed={tasteVote === 'dislike'}
                aria-label="I dislike this image style"
              >
                <ThumbsDown className="w-4 h-4" strokeWidth={1.75} />
                Not this
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
