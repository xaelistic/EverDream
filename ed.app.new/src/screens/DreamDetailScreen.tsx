import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ArrowLeft,
  Award,
  Shield,
  Eye,
  Camera,
  MessageCircle,
  Star,
  ChevronDown,
  ChevronUp,
  FileText,
  Mic,
  Play,
} from 'lucide-react';
import { FEATURE_NFT_UI_ENABLED } from '../config/features';
import DreamVisualizer from '../components/dreams/DreamVisualizer';
import type { EmotionCapture } from '../components/face/FacialEmotionDetector';
import { mediaStorageManager } from '../lib/mediaStorage';
import { useSubscription } from '../hooks/use-subscription';
import { coerceNarrativeText } from '../lib/normalizeDreamAnalysis';
import type { DreamAsset } from '../modules/sleep/types';

interface DreamInterpretation {
  symbols: Record<string, string>;
  meaning: string;
  commonPattern: string;
}

interface DreamContext {
  mood: string;
  yesterdayEvents: string;
  sleepQuality: number;
}

interface DreamAssetMetadata {
  rarityScore: number;
  uniquenessScore: number;
  culturalContext: string;
  potentialValue: string;
}

interface GeneratedImage {
  url: string;
  prompt: string;
  style: string;
  generatedAt: string;
  source?: string;
}

interface AudioCapture {
  url?: string;
  capturedAt?: string;
  duration?: number;
  mediaId?: string;
}

interface Dream {
  id: string;
  date: string;
  content: string;
  category: string;
  themes: string[];
  emotion: string;
  symbols: string[];
  narrative: string;
  nugget: string;
  interpretation: DreamInterpretation;
  moodValence?: number;
  assetMetadata?: DreamAssetMetadata;
  context?: DreamContext;
  generatedImage?: GeneratedImage | null;
  captureMode?: string;
  capturedEmotions?: EmotionCapture | null;
  isSample?: boolean;
  sourcePhotos?: string[];
  videoCapture?: { url: string; capturedAt: string; duration?: number; thumbnail?: string; mediaId?: string } | null;
  audioCapture?: AudioCapture | null;
  sourceAudio?: string | null;
  audioFile?: string;
}

interface SimilarDream {
  dream: Dream;
  score: number;
}

interface DreamDetailScreenProps {
  detailDream: Dream;
  navigate: (screen: string, dreamId?: string) => void;
  shareDream: (dream: Dream) => void;
  handleOpenMintModal: (dream: Dream) => void;
  findSimilarDreams: (dream: Dream) => SimilarDream[];
  getCategoryBadgeClass: (category: string) => string;
  getEmotionEmoji: (emotion: string) => string;
  onImageGenerated: (asset: GeneratedImage) => void;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
}

function formatDuration(totalSeconds?: number): string | null {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function isPlaceholderTranscript(text: string): boolean {
  return /processing your (audio |video )?dream/i.test(text.trim());
}

export function DreamDetailScreen({
  detailDream,
  navigate,
  shareDream,
  handleOpenMintModal,
  findSimilarDreams,
  getCategoryBadgeClass,
  getEmotionEmoji,
  onImageGenerated,
  isFavourite = false,
  onToggleFavourite,
}: DreamDetailScreenProps) {
  const { isAdmin } = useSubscription();
  const [showTranscript, setShowTranscript] = useState(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(
    detailDream.videoCapture?.url ?? null,
  );
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(
    detailDream.audioCapture?.url || detailDream.sourceAudio || detailDream.audioFile || null,
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  const summary = useMemo(
    () => coerceNarrativeText(detailDream.nugget, ''),
    [detailDream.nugget],
  );
  const analysisNarrative = useMemo(
    () => coerceNarrativeText(detailDream.narrative, ''),
    [detailDream.narrative],
  );
  const transcript = (detailDream.content || '').trim();
  const canShowTranscript = transcript.length > 0 && !isPlaceholderTranscript(transcript);

  useEffect(() => {
    let objectUrl: string | null = null;

    const resolveVideo = async () => {
      const mediaId = detailDream.videoCapture?.mediaId;
      if (!mediaId) {
        setResolvedVideoUrl(detailDream.videoCapture?.url ?? null);
        return;
      }

      try {
        const media = await mediaStorageManager.getMedia(mediaId);
        if (media) {
          objectUrl = URL.createObjectURL(media.blob);
          setResolvedVideoUrl(objectUrl);
        } else {
          setResolvedVideoUrl(detailDream.videoCapture?.url ?? null);
        }
      } catch {
        setResolvedVideoUrl(detailDream.videoCapture?.url ?? null);
      }
    };

    resolveVideo();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [detailDream.id, detailDream.videoCapture?.mediaId, detailDream.videoCapture?.url]);

  useEffect(() => {
    let objectUrl: string | null = null;

    const resolveAudio = async () => {
      const mediaId = detailDream.audioCapture?.mediaId;
      const fallback =
        detailDream.audioCapture?.url || detailDream.sourceAudio || detailDream.audioFile || null;
      if (!mediaId) {
        setResolvedAudioUrl(fallback);
        return;
      }

      try {
        const media = await mediaStorageManager.getMedia(mediaId);
        if (media) {
          objectUrl = URL.createObjectURL(media.blob);
          setResolvedAudioUrl(objectUrl);
        } else {
          setResolvedAudioUrl(fallback);
        }
      } catch {
        setResolvedAudioUrl(fallback);
      }
    };

    resolveAudio();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    detailDream.id,
    detailDream.audioCapture?.mediaId,
    detailDream.audioCapture?.url,
    detailDream.sourceAudio,
    detailDream.audioFile,
  ]);

  const hasVideo = Boolean(detailDream.videoCapture && (resolvedVideoUrl || detailDream.videoCapture.url));
  const hasAudio = Boolean(resolvedAudioUrl) && !hasVideo;
  const videoDuration = formatDuration(detailDream.videoCapture?.duration);
  const audioDuration = formatDuration(detailDream.audioCapture?.duration);

  const handleImageGenerated = (asset: DreamAsset) => {
    onImageGenerated({
      url: asset.url,
      prompt: asset.prompt,
      style: asset.style,
      generatedAt: asset.generatedAt,
      source: asset.source,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('journal')}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
          aria-label="Back to journal"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Journal
        </button>
        {onToggleFavourite && (
          <button
            type="button"
            onClick={onToggleFavourite}
            className="w-10 h-10 rounded-full border border-line bg-cream hover:bg-parchment shadow-paper flex items-center justify-center transition"
            aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            aria-pressed={isFavourite}
          >
            <Star
              className={`w-5 h-5 ${isFavourite ? 'text-amber-500 fill-amber-400' : 'text-muted'}`}
              strokeWidth={1.75}
            />
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-line bg-cream shadow-lift overflow-hidden">
        <DreamVisualizer
          dreamId={detailDream.id}
          dreamText={detailDream.narrative || detailDream.content}
          dreamTitle={detailDream.nugget}
          existingImageUrl={detailDream.generatedImage?.url}
          onImageGenerated={handleImageGenerated}
          onShare={() => shareDream(detailDream)}
        />

        <div className="space-y-4 p-5 sm:p-6 pt-4">
          {(hasVideo || hasAudio) && (
            <section className="rounded-2xl border border-line bg-parchment/50 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {hasVideo ? (
                  <Play className="w-3.5 h-3.5 text-duskDeep" strokeWidth={1.75} />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-duskDeep" strokeWidth={1.75} />
                )}
                Replay
                {(hasVideo ? videoDuration : audioDuration) && (
                  <span className="font-medium normal-case tracking-normal">
                    {hasVideo ? videoDuration : audioDuration}
                  </span>
                )}
              </div>
              {hasVideo && (
                <video
                  ref={videoRef}
                  src={resolvedVideoUrl || detailDream.videoCapture?.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-56 bg-ink"
                  poster={detailDream.videoCapture?.thumbnail || detailDream.generatedImage?.url}
                />
              )}
              {hasAudio && resolvedAudioUrl && (
                <div className="px-3 pb-3">
                  <audio src={resolvedAudioUrl} controls preload="metadata" className="w-full" />
                </div>
              )}
            </section>
          )}

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`${getCategoryBadgeClass(detailDream.category)} px-3 py-1 rounded-full text-xs font-semibold`}>
                  {detailDream.category}
                </span>
                <span className="text-2xl">{getEmotionEmoji(detailDream.emotion)}</span>
              </div>
              <div className="text-sm text-muted">
                {new Date(detailDream.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
            {detailDream.moodValence !== undefined && (
              <div className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-parchment px-3 py-2">
                <span className="text-[10px] uppercase tracking-wide text-muted">Valence</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-2 bg-line rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${((detailDream.moodValence + 1) / 2) * 100}%`,
                        background: detailDream.moodValence >= 0
                          ? 'linear-gradient(90deg, #5ec4a8, #4a9e86)'
                          : 'linear-gradient(90deg, #e88fa0, #c86070)',
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-ink">
                    {detailDream.moodValence >= 0 ? '+' : ''}
                    {detailDream.moodValence.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-2">
              Summary
            </h3>
            {summary && (
              <p className="text-lg font-serif font-medium text-ink italic mb-3 leading-snug">
                “{summary}”
              </p>
            )}
            {detailDream.themes?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {detailDream.themes.slice(0, 6).map((theme) => (
                  <span
                    key={theme}
                    className="text-[11px] text-muted bg-parchment border border-line px-2 py-0.5 rounded-full"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            )}
          </section>

          {(detailDream.interpretation || analysisNarrative) && (
            <section className="rounded-2xl border border-line bg-parchment/60 p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm text-ink">
                <Eye className="w-4 h-4 text-duskDeep" strokeWidth={1.75} />
                Analysis
              </h3>
              {analysisNarrative && analysisNarrative !== summary && (
                <p className="text-sm mb-3 text-muted leading-relaxed">{analysisNarrative}</p>
              )}
              {detailDream.interpretation?.meaning && (
                <p className="text-sm mb-3 text-ink leading-relaxed">
                  {detailDream.interpretation.meaning}
                </p>
              )}
              {Object.keys(detailDream.interpretation?.symbols || {}).length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Symbols</div>
                  {Object.entries(detailDream.interpretation.symbols).map(([symbol, meaning]) => (
                    <div key={symbol} className="text-xs text-ink">
                      <span className="font-semibold capitalize">{symbol}:</span>{' '}
                      <span className="text-muted">{meaning}</span>
                    </div>
                  ))}
                </div>
              )}
              {detailDream.interpretation?.commonPattern && (
                <div className="mt-3 text-xs text-muted italic border-t border-line pt-3">
                  {detailDream.interpretation.commonPattern}
                </div>
              )}
            </section>
          )}

          {canShowTranscript && (
            <section>
              <button
                type="button"
                onClick={() => setShowTranscript((open) => !open)}
                className="w-full flex items-center justify-between gap-2 rounded-2xl border border-line bg-cream hover:bg-parchment/60 px-4 py-3 text-sm font-medium text-ink transition"
                aria-expanded={showTranscript}
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="w-4 h-4 text-duskDeep" strokeWidth={1.75} />
                  Full transcript
                </span>
                {showTranscript ? (
                  <ChevronUp className="w-4 h-4 text-muted" strokeWidth={1.75} />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted" strokeWidth={1.75} />
                )}
              </button>
              {showTranscript && (
                <p className="mt-3 text-sm leading-relaxed text-ink whitespace-pre-wrap px-1">
                  {transcript}
                </p>
              )}
            </section>
          )}

          {detailDream.captureMode === 'photo' && (
            <div className="rounded-2xl border border-sage/20 bg-sage/5 px-4 py-2.5 flex items-center gap-2 text-sm text-sageDark">
              <Camera className="w-4 h-4" strokeWidth={1.75} />
              <span>
                Imported from journal photo
                {detailDream.sourcePhotos && detailDream.sourcePhotos.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {detailDream.capturedEmotions && (
            <div className="rounded-2xl border border-dusk/20 bg-dusk/5 px-4 py-2.5 flex items-center gap-2 text-sm text-duskDeep">
              <span className="text-lg">
                {detailDream.capturedEmotions.dominantEmotion === 'happy' ? '😊'
                  : detailDream.capturedEmotions.dominantEmotion === 'sad' ? '😢'
                    : detailDream.capturedEmotions.dominantEmotion === 'angry' ? '😠'
                      : detailDream.capturedEmotions.dominantEmotion === 'surprised' ? '😲'
                        : detailDream.capturedEmotions.dominantEmotion === 'fearful' ? '😰'
                          : detailDream.capturedEmotions.dominantEmotion === 'disgusted' ? '🤢'
                            : '😐'}
              </span>
              <span>Facial emotion: {detailDream.capturedEmotions.dominantEmotion}</span>
            </div>
          )}

          {isAdmin && detailDream.assetMetadata && (
            <div className="rounded-2xl border border-line bg-parchment/80 p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-ink">
                <Shield className="w-4 h-4 text-sage" strokeWidth={1.75} />
                Reflection metadata
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted">Pattern depth</div>
                  <div className="font-semibold text-ink">{detailDream.assetMetadata.rarityScore}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted">Uniqueness</div>
                  <div className="font-semibold text-ink">{detailDream.assetMetadata.uniquenessScore}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted">Potential value</div>
                  <div className="font-semibold capitalize text-ink">{detailDream.assetMetadata.potentialValue}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted">Watermark</div>
                  <div className="font-semibold text-sageDark">Verified</div>
                </div>
              </div>
            </div>
          )}

          {detailDream.context && (detailDream.context.mood || detailDream.context.yesterdayEvents) && (
            <div className="rounded-2xl border border-line bg-parchment/60 p-4">
              <h3 className="font-semibold mb-2 text-sm text-ink">Evening context</h3>
              <div className="text-xs space-y-1 text-muted">
                {detailDream.context.mood && (
                  <div>
                    <span className="text-ink font-medium">Mood before bed:</span> {detailDream.context.mood}
                  </div>
                )}
                {detailDream.context.yesterdayEvents && (
                  <div>
                    <span className="text-ink font-medium">Yesterday:</span> {detailDream.context.yesterdayEvents}
                  </div>
                )}
              </div>
            </div>
          )}

          {!detailDream.isSample && findSimilarDreams(detailDream).length > 0 && (
            <div className="rounded-2xl border border-blush/80 bg-blush/25 p-4">
              <h3 className="font-semibold mb-2 text-sm flex items-center gap-2 text-ink">
                <MessageCircle className="w-4 h-4 text-duskDeep" strokeWidth={1.75} />
                Related entries
              </h3>
              <div className="space-y-2">
                {findSimilarDreams(detailDream).map(({ dream }) => (
                  <div
                    key={dream.id}
                    onClick={() => navigate('dream', dream.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate('dream', dream.id);
                    }}
                    className="text-xs p-3 rounded-xl bg-cream/90 border border-line cursor-pointer hover:border-dusk/40 transition"
                  >
                    {new Date(dream.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}:{' '}
                    {dream.nugget?.substring(0, 60)}...
                  </div>
                ))}
              </div>
            </div>
          )}

          {FEATURE_NFT_UI_ENABLED ? (
            <button
              type="button"
              onClick={() => handleOpenMintModal(detailDream)}
              className="w-full border-2 border-dusk/30 bg-dusk/5 hover:bg-dusk/10 text-duskDeep py-3 rounded-xl transition flex items-center justify-center gap-2 font-medium text-sm"
              aria-label="Mint as NFT"
            >
              <Award className="w-4 h-4" strokeWidth={1.75} />
              Mint NFT
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
