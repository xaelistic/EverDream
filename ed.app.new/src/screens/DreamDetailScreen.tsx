import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronLeft,
  ChevronRight,
  FileText,
  Mic,
  Play,
  X,
} from 'lucide-react';
import { FEATURE_NFT_UI_ENABLED } from '../config/features';
import DreamVisualizer from '../components/dreams/DreamVisualizer';
import type { EmotionCapture } from '../components/face/FacialEmotionDetector';
import { mediaStorageManager } from '../lib/mediaStorage';
import { persistUserMedia, signedMediaUrl } from '../lib/mediaPersist';
import { isStuckJournalDream, type JournalMediaDream } from '../lib/audioJournal';
import { reprocessStuckMediaDream } from '../lib/stuckDreamProcessor';
import { useSubscription } from '../hooks/use-subscription';
import { coerceNarrativeText } from '../lib/normalizeDreamAnalysis';
import { deriveDreamTitle, presentDream } from '../lib/dreamClassify';
import { dreamTellingFromTranscript } from '../lib/cleanDreamTranscript';
import { analyzeDream } from '../lib/dream-analyzer';
import { generateDreamImage } from '../modules/sleep/dreamAssetGenerator';
import { generateParallaxVideo } from '../lib/assets/pipeline';
import {
  analysisLooksPending,
  detectDreamScenes,
  formatTranscriptParagraphs,
  type DreamScene,
} from '../lib/dreamScenes';
import { canGenerateImage, recordImageGeneration } from '../lib/subscriptions/usageLimits';
import type { DreamAsset } from '../modules/sleep/types';
import { useToast } from '../components/ui/Toast';

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
  path?: string;
  capturedAt?: string;
  duration?: number;
  mediaId?: string;
  fileName?: string;
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
  videoCapture?: { url: string; path?: string; capturedAt: string; duration?: number; thumbnail?: string; mediaId?: string } | null;
  audioCapture?: AudioCapture | null;
  sourceAudio?: string | null;
  audioFile?: string;
  scenes?: DreamScene[];
  storyboardImages?: { url: string; title: string; prompt: string }[];
  parallaxVideoUrl?: string | null;
  title?: string;
  processingStatus?: 'processing' | 'complete' | 'failed';
  processingStep?: 'transcribe' | 'analyse' | 'image' | 'complete';
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
  onUpdateDream?: (patch: Partial<Dream>) => void;
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
  onUpdateDream,
  isFavourite = false,
  onToggleFavourite,
}: DreamDetailScreenProps) {
  const { isAdmin, tier, hasFeature } = useSubscription();
  const { addToast } = useToast();
  const [showTranscript, setShowTranscript] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [storyboardBusy, setStoryboardBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);
  const [storyboardViewIndex, setStoryboardViewIndex] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(
    detailDream.videoCapture?.url ?? null,
  );
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(
    detailDream.audioCapture?.url || detailDream.sourceAudio || detailDream.audioFile || null,
  );
  const [retrying, setRetrying] = useState(false);
  const retriedIdRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const summary = useMemo(
    () => coerceNarrativeText(detailDream.nugget, ''),
    [detailDream.nugget],
  );
  const analysisNarrative = useMemo(
    () => coerceNarrativeText(detailDream.narrative, ''),
    [detailDream.narrative],
  );
  const transcript = dreamTellingFromTranscript(
    detailDream.content || '',
    analysisNarrative,
  );
  const canShowTranscript = transcript.length > 0 && !isPlaceholderTranscript(transcript);
  const transcriptParagraphs = useMemo(() => formatTranscriptParagraphs(transcript), [transcript]);
  const analysisPending = analysisLooksPending(
    detailDream.interpretation?.meaning,
    detailDream.category,
    detailDream.themes,
  );
  const scenes = useMemo(
    () => (detailDream.scenes?.length ? detailDream.scenes : detectDreamScenes(transcript || analysisNarrative)),
    [detailDream.scenes, transcript, analysisNarrative],
  );
  const isPremium = isAdmin || hasFeature('image_generation_unlimited');
  const storyboardCost = Math.max(2, scenes.length);
  const videoCost = 3;

  const spendCredits = (count: number): boolean => {
    if (isPremium) return true;
    const check = canGenerateImage(tier);
    if (check.remaining < count) {
      addToast({
        type: 'warning',
        message: `Need ${count} image credits (${check.remaining} left this month). Plus includes storyboard and video.`,
      });
      return false;
    }
    for (let i = 0; i < count; i++) recordImageGeneration();
    return true;
  };

  const runAnalysis = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const analysis = await analyzeDream(transcript || analysisNarrative);
      const nextScenes = detectDreamScenes(transcript || analysis.narrative || analysisNarrative);
      onUpdateDream?.({
        category: analysis.category,
        themes: analysis.themes,
        emotion: analysis.emotion,
        symbols: analysis.symbols,
        narrative: analysis.narrative,
        nugget: analysis.nugget,
        title: deriveDreamTitle(analysis.nugget, analysis.narrative || transcript),
        interpretation: analysis.interpretation,
        moodValence: analysis.valence,
        scenes: nextScenes,
        processingStatus: 'complete',
      });
      addToast({ type: 'success', message: 'Analysis is ready.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Analysis failed. Try again in a moment.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (analysisPending && (transcript || analysisNarrative).length >= 10 && !isPlaceholderTranscript(transcript)) {
      void runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot when opening a pending dream
  }, [detailDream.id]);

  const retryMediaProcessing = async () => {
    if (retrying || !onUpdateDream) return;
    setRetrying(true);
    onUpdateDream({ processingStatus: 'processing', processingStep: 'transcribe' });
    try {
      const next = await reprocessStuckMediaDream(detailDream as unknown as JournalMediaDream);
      if (!next) throw new Error('Could not find the saved recording to transcribe.');
      onUpdateDream(next as Partial<Dream>);
      addToast({ type: 'success', message: 'Your audio dream is ready.' });
    } catch (err) {
      onUpdateDream({ processingStatus: 'failed', processingStep: 'transcribe' });
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Transcription failed. Try again in a moment.',
      });
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    const stuckAudio =
      (detailDream.captureMode === 'audio' || Boolean(detailDream.audioCapture)) &&
      isStuckJournalDream(detailDream);
    if (!stuckAudio || retriedIdRef.current === detailDream.id) return;
    retriedIdRef.current = detailDream.id;
    void retryMediaProcessing();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- retry once per dream open
  }, [detailDream.id]);

  const runStoryboard = async () => {
    if (storyboardBusy || scenes.length < 2) return;
    if (!spendCredits(storyboardCost)) return;
    setStoryboardBusy(true);
    setStoryboardError(null);
    try {
      const frames: { url: string; title: string; prompt: string }[] = [];
      for (const scene of scenes) {
        const asset = await generateDreamImage(
          `${scene.prompt}, sequential storyboard panel, consistent dream characters, cinematic still`,
          'cinematic',
        );
        frames.push({ url: asset.url, title: scene.title, prompt: scene.prompt });
      }
      onUpdateDream?.({ scenes, storyboardImages: frames });
      setStoryboardViewIndex(0);
      addToast({ type: 'success', message: `Storyboard ready — ${frames.length} scenes. Tap a panel to enlarge.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Storyboard generation failed.';
      setStoryboardError(message);
      addToast({ type: 'error', message });
    } finally {
      setStoryboardBusy(false);
    }
  };

  const runVideo = async () => {
    const still = detailDream.generatedImage?.url;
    if (!still) {
      addToast({ type: 'warning', message: 'Generate the summary image first, then we can animate it.' });
      return;
    }
    if (!spendCredits(videoCost)) return;
    setVideoBusy(true);
    setVideoError(null);
    try {
      const blobUrl = await generateParallaxVideo(still, still, {
        duration: 6,
        fps: 24,
        amplitude: 0.1,
        direction: 'circular',
      });
      let url = blobUrl;
      try {
        const blob = await fetch(blobUrl).then((r) => r.blob());
        const stored = await persistUserMedia({ blob, kind: 'video', dreamId: detailDream.id });
        if (stored?.url) url = stored.url;
      } catch {
        /* keep blob url for this session */
      }
      onUpdateDream?.({ parallaxVideoUrl: url });
      addToast({ type: 'success', message: 'Motion clip is ready.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Video generation failed.';
      setVideoError(message);
      addToast({ type: 'error', message });
    } finally {
      setVideoBusy(false);
    }
  };

  useEffect(() => {
    let objectUrl: string | null = null;

    const resolveVideo = async () => {
      const mediaId = detailDream.videoCapture?.mediaId;
      const path = detailDream.videoCapture?.path;
      const fallback = detailDream.videoCapture?.url ?? null;

      if (mediaId) {
        try {
          const media = await mediaStorageManager.getMedia(mediaId);
          if (media) {
            objectUrl = URL.createObjectURL(media.blob);
            setResolvedVideoUrl(objectUrl);
            return;
          }
        } catch {
          /* fall through */
        }
      }

      if (path) {
        const signed = await signedMediaUrl(path);
        if (signed) {
          setResolvedVideoUrl(signed);
          return;
        }
      }

      setResolvedVideoUrl(fallback && !fallback.startsWith('blob:') ? fallback : null);
    };

    resolveVideo();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [detailDream.id, detailDream.videoCapture?.mediaId, detailDream.videoCapture?.url, detailDream.videoCapture?.path]);

  useEffect(() => {
    let objectUrl: string | null = null;

    const resolveAudio = async () => {
      const mediaId = detailDream.audioCapture?.mediaId;
      const path = detailDream.audioCapture?.path;
      const fallback =
        detailDream.audioCapture?.url || detailDream.sourceAudio || detailDream.audioFile || null;

      if (mediaId) {
        try {
          const media = await mediaStorageManager.getMedia(mediaId);
          if (media) {
            objectUrl = URL.createObjectURL(media.blob);
            setResolvedAudioUrl(objectUrl);
            return;
          }
        } catch {
          /* fall through */
        }
      }

      if (path) {
        const signed = await signedMediaUrl(path);
        if (signed) {
          setResolvedAudioUrl(signed);
          return;
        }
      }

      setResolvedAudioUrl(fallback && !fallback.startsWith('blob:') ? fallback : fallback);
    };

    resolveAudio();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    detailDream.id,
    detailDream.audioCapture?.mediaId,
    detailDream.audioCapture?.url,
    detailDream.audioCapture?.path,
    detailDream.sourceAudio,
    detailDream.audioFile,
  ]);

  const hasVideo = Boolean(detailDream.videoCapture && (resolvedVideoUrl || detailDream.videoCapture.url));
  const hasAudio = Boolean(resolvedAudioUrl) && !hasVideo;
  const videoDuration = formatDuration(detailDream.videoCapture?.duration);
  const audioDuration = formatDuration(detailDream.audioCapture?.duration);
  const presented = presentDream(detailDream);

  const storyboardFrames = useMemo(
    () => normalizeStoryboardFrames(detailDream.storyboardImages),
    [detailDream.storyboardImages],
  );
  const openStoryboardFrame = storyboardViewIndex != null ? storyboardFrames[storyboardViewIndex] : null;

  useEffect(() => {
    if (storyboardViewIndex == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStoryboardViewIndex(null);
      if (event.key === 'ArrowRight' && storyboardFrames.length) {
        setStoryboardViewIndex((i) => (i == null ? 0 : (i + 1) % storyboardFrames.length));
      }
      if (event.key === 'ArrowLeft' && storyboardFrames.length) {
        setStoryboardViewIndex((i) =>
          i == null ? 0 : (i - 1 + storyboardFrames.length) % storyboardFrames.length,
        );
      }
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [storyboardViewIndex, storyboardFrames.length]);

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
    <>
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
          dreamTitle={presented.title}
          existingImageUrl={detailDream.generatedImage?.url}
          processingStatus={detailDream.processingStatus}
          processingStep={detailDream.processingStep}
          onImageGenerated={handleImageGenerated}
          onShare={() => shareDream(detailDream)}
        />

        <div className="space-y-4 p-5 sm:p-6 pt-4">
          {(detailDream.processingStatus === 'failed' || retrying || (
            isStuckJournalDream(detailDream) && (detailDream.captureMode === 'audio' || Boolean(detailDream.audioCapture))
          )) && (
            <div className="rounded-2xl border border-line bg-parchment/60 p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {retrying
                  ? 'Transcribing your recording…'
                  : 'This audio journal is saved but not transcribed yet.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  retriedIdRef.current = null;
                  void retryMediaProcessing();
                }}
                disabled={retrying}
                className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-line bg-cream hover:bg-parchment disabled:opacity-50"
              >
                {retrying ? 'Working…' : 'Retry transcription'}
              </button>
            </div>
          )}

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
                <span className={`${getCategoryBadgeClass(presented.category)} px-3 py-1 rounded-full text-xs font-semibold`}>
                  {presented.category}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 text-sm text-ink"
                  title={`Mood from the dream${detailDream.capturedEmotions ? ', face, and voice' : ''}`}
                >
                  <span className="text-2xl" aria-hidden>{getEmotionEmoji(presented.emotion)}</span>
                  <span className="text-xs text-muted">{presented.emotionName}</span>
                </span>
              </div>
              <div className="text-sm text-muted">
                {presented.when.primary}{presented.when.secondary ? ` · ${presented.when.secondary}` : ''}
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

          <section className="rounded-2xl border border-line bg-parchment/60 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-semibold flex items-center gap-2 text-sm text-ink">
                <Eye className="w-4 h-4 text-duskDeep" strokeWidth={1.75} />
                Analysis
              </h3>
              <button
                type="button"
                onClick={() => void runAnalysis()}
                disabled={analyzing}
                className="text-xs font-medium text-sageDark hover:text-ink disabled:opacity-50"
              >
                {analyzing ? 'Analysing…' : analysisPending ? 'Run analysis' : 'Refresh'}
              </button>
            </div>
            {analyzing && (
              <p className="text-sm text-muted">Reading the dream — this can take up to a minute.</p>
            )}
            {!analyzing && analysisPending && (
              <p className="text-sm text-muted">
                No analysis yet. Tap Run analysis to generate symbols, meaning, and scenes.
              </p>
            )}
            {!analyzing && !analysisPending && analysisNarrative && analysisNarrative !== summary && (
              <p className="text-sm mb-3 text-muted leading-relaxed whitespace-pre-wrap">{analysisNarrative}</p>
            )}
            {!analyzing && !analysisPending && detailDream.interpretation?.meaning && (
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
            {detailDream.interpretation?.commonPattern && !analysisPending && (
              <div className="mt-3 text-xs text-muted italic border-t border-line pt-3">
                {detailDream.interpretation.commonPattern}
              </div>
            )}
          </section>

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
                <div className="mt-3 space-y-3 px-1">
                  {transcriptParagraphs.split(/\n\n/).map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-ink">
                      {para}
                    </p>
                  ))}
                </div>
              )}
            </section>
          )}

          {scenes.length >= 2 && (
            <section className="rounded-2xl border border-line bg-cream p-4">
              <h3 className="font-semibold text-sm text-ink mb-1">Storyboard</h3>
              <p className="text-[11px] text-muted mb-3">
                This dream looks like {scenes.length} scenes. Generate a comic-style sequence
                {isPremium ? ' — included with your plan.' : ` — ${storyboardCost} image credits.`}
              </p>
              {storyboardFrames.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {storyboardFrames.map((frame, index) => (
                    <button
                      key={`${frame.url}-${index}`}
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setStoryboardViewIndex(index);
                      }}
                      className="relative rounded-xl overflow-hidden border border-line bg-parchment text-left hover:border-sage/50 hover:shadow-paper transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sage cursor-pointer"
                    >
                      <img src={frame.url} alt="" className="w-full h-40 object-cover pointer-events-none" />
                      <span className="absolute inset-0" aria-hidden />
                      <span className="relative block px-2 py-1.5 text-[11px] text-ink font-medium bg-parchment/95">
                        {index + 1}. {frame.title} · Open
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void runStoryboard()}
                  disabled={storyboardBusy}
                  className="w-full bg-parchment hover:bg-sage/15 border border-line text-ink py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {storyboardBusy ? 'Painting scenes…' : 'Generate storyboard'}
                </button>
              )}
              {storyboardError && <p className="mt-2 text-xs text-duskDeep">{storyboardError}</p>}
            </section>
          )}

          <section className="rounded-2xl border border-line bg-cream p-4">
            <h3 className="font-semibold text-sm text-ink mb-1">Dream video</h3>
            <p className="text-[11px] text-muted mb-3">
              Animate the summary image into a short motion clip
              {isPremium ? ' — included with your plan.' : ` — ${videoCost} image credits.`}
            </p>
            {detailDream.parallaxVideoUrl ? (
              <video
                src={detailDream.parallaxVideoUrl}
                controls
                playsInline
                loop
                className="w-full rounded-xl bg-ink max-h-64"
                poster={detailDream.generatedImage?.url}
              />
            ) : (
              <button
                type="button"
                onClick={() => void runVideo()}
                disabled={videoBusy || !detailDream.generatedImage?.url}
                className="w-full bg-parchment hover:bg-sage/15 border border-line text-ink py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {videoBusy ? 'Rendering clip…' : 'Generate video'}
              </button>
            )}
            {videoError && <p className="mt-2 text-xs text-duskDeep">{videoError}</p>}
          </section>

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

    {openStoryboardFrame && storyboardViewIndex != null && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex flex-col text-cream"
            style={{ background: 'rgba(10, 9, 12, 0.97)' }}
            role="dialog"
            aria-modal="true"
            aria-label={`Storyboard scene ${storyboardViewIndex + 1}: ${openStoryboardFrame.title}`}
          >
            <div className="relative flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/55">
                Scene {storyboardViewIndex + 1} of {storyboardFrames.length}
              </p>
              <button
                type="button"
                onClick={() => setStoryboardViewIndex(null)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm"
                aria-label="Close storyboard"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
                Close
              </button>
            </div>

            <div className="relative flex-1 flex items-center justify-center px-3 min-h-0 overflow-auto">
              {storyboardFrames.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setStoryboardViewIndex(
                      (storyboardViewIndex - 1 + storyboardFrames.length) % storyboardFrames.length,
                    )
                  }
                  className="absolute left-2 z-10 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
                  aria-label="Previous scene"
                >
                  <ChevronLeft className="w-6 h-6" strokeWidth={1.75} />
                </button>
              )}
              <img
                src={openStoryboardFrame.url}
                alt={openStoryboardFrame.title}
                className="max-h-[75dvh] w-auto max-w-full object-contain rounded-lg"
              />
              {storyboardFrames.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setStoryboardViewIndex((storyboardViewIndex + 1) % storyboardFrames.length)
                  }
                  className="absolute right-2 z-10 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
                  aria-label="Next scene"
                >
                  <ChevronRight className="w-6 h-6" strokeWidth={1.75} />
                </button>
              )}
            </div>

            <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 max-w-lg mx-auto w-full">
              <p className="font-serif text-xl leading-snug">{openStoryboardFrame.title}</p>
              {openStoryboardFrame.prompt && (
                <p className="mt-2 text-sm text-white/70 leading-relaxed line-clamp-3">
                  {openStoryboardFrame.prompt}
                </p>
              )}
            </div>
          </div>,
          document.body,
        )
      : null}
    </>
  );
}

function normalizeStoryboardFrames(
  raw: Dream['storyboardImages'],
): { url: string; title: string; prompt: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((frame, index) => {
      const url = String(frame?.url || '');
      if (!url) return null;
      return {
        url,
        title: String(frame.title || `Scene ${index + 1}`),
        prompt: String(frame.prompt || ''),
      };
    })
    .filter((frame): frame is { url: string; title: string; prompt: string } => Boolean(frame));
}
