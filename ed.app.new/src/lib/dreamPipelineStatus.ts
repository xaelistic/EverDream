/**
 * Per-step dream pipeline status.
 *
 * Lets the journal (and the hourly catch-up) check whether audio was captured,
 * transcription finished, analysis ran, and an image was generated.
 */

import { analysisLooksPending } from './dreamScenes';
import { isPlaceholderJournalText } from './audioJournal';

export const PIPELINE_STEPS = ['audio_captured', 'transcription', 'analysis', 'image'] as const;

export type PipelineStepName = (typeof PIPELINE_STEPS)[number];
export type PipelineStepState = 'pending' | 'running' | 'done' | 'error' | 'skipped';
export type PipelineOverall = 'pending' | 'processing' | 'complete' | 'failed' | 'partial';

export interface DreamPipelineStatus {
  audio_captured: PipelineStepState;
  transcription: PipelineStepState;
  analysis: PipelineStepState;
  image: PipelineStepState;
  overall: PipelineOverall;
  last_checked_at: string | null;
  last_error: string | null;
  attempts: number;
}

export interface PipelineDreamLike {
  captureMode?: string | null;
  content?: string | null;
  transcript?: string | null;
  narrative?: unknown;
  nugget?: unknown;
  category?: string | null;
  themes?: string[] | null;
  interpretation?: unknown;
  generatedImage?: { url?: string; source?: string } | null;
  generatedImageUrl?: string | null;
  generatedImageSource?: string | null;
  audioCapture?: { url?: string; path?: string; mediaId?: string } | null | unknown;
  videoCapture?: { url?: string; path?: string; mediaId?: string } | null | unknown;
  mediaStoragePath?: string | null;
  audioFile?: string | null;
  sourceAudio?: string | null;
  processingStatus?: string | null;
  pipelineStatus?: DreamPipelineStatus | null;
  isSample?: boolean;
}

const EMPTY_STATUS: DreamPipelineStatus = {
  audio_captured: 'pending',
  transcription: 'pending',
  analysis: 'pending',
  image: 'pending',
  overall: 'pending',
  last_checked_at: null,
  last_error: null,
  attempts: 0,
};

const PLACEHOLDER_SOURCES = new Set(['video-capture', 'placeholder']);

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && 'summary' in value) {
    const summary = (value as { summary?: unknown }).summary;
    return typeof summary === 'string' ? summary.trim() : '';
  }
  return '';
}

function mediaRef(value: unknown): { url?: string; path?: string; mediaId?: string } | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  return {
    url: typeof row.url === 'string' ? row.url : undefined,
    path: typeof row.path === 'string' ? row.path : undefined,
    mediaId: typeof row.mediaId === 'string' ? row.mediaId : undefined,
  };
}

function hasPlayableRef(ref?: { url?: string; path?: string; mediaId?: string } | null, extra?: string | null): boolean {
  if (!ref && !extra) return false;
  if (ref?.mediaId || ref?.path || extra) return true;
  const url = ref?.url || '';
  return Boolean(url) && !url.startsWith('blob:');
}

function interpretationMeaning(interpretation: unknown): string {
  if (!interpretation || typeof interpretation !== 'object') {
    return typeof interpretation === 'string' ? interpretation : '';
  }
  const meaning = (interpretation as { meaning?: unknown }).meaning;
  return asText(meaning);
}

export function isDreamImageReady(dream: PipelineDreamLike): boolean {
  const url = dream.generatedImage?.url || dream.generatedImageUrl || '';
  if (!url) return false;
  const source = dream.generatedImage?.source || dream.generatedImageSource || '';
  if (PLACEHOLDER_SOURCES.has(source)) return false;
  if (url.startsWith('data:') && url.length < 80) return false;
  return true;
}

export function isTranscriptReady(dream: PipelineDreamLike): boolean {
  const text = asText(dream.transcript) || asText(dream.content);
  if (!text || isPlaceholderJournalText(text)) return false;
  return text.length >= 10;
}

export function isAnalysisReady(dream: PipelineDreamLike): boolean {
  const meaning = interpretationMeaning(dream.interpretation);
  const narrative = asText(dream.narrative);
  if (isPlaceholderJournalText(meaning) || isPlaceholderJournalText(narrative)) return false;
  if (analysisLooksPending(meaning, dream.category || undefined, dream.themes || undefined)) {
    return false;
  }
  return meaning.length >= 8 || narrative.length >= 20;
}

export function emptyPipelineStatus(partial?: Partial<DreamPipelineStatus>): DreamPipelineStatus {
  return { ...EMPTY_STATUS, ...partial };
}

export function normalizePipelineStatus(raw: unknown): DreamPipelineStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const step = (value: unknown, fallback: PipelineStepState): PipelineStepState => {
    if (
      value === 'pending' ||
      value === 'running' ||
      value === 'done' ||
      value === 'error' ||
      value === 'skipped'
    ) {
      return value;
    }
    return fallback;
  };
  const overallRaw = row.overall;
  const overall: PipelineOverall =
    overallRaw === 'pending' ||
    overallRaw === 'processing' ||
    overallRaw === 'complete' ||
    overallRaw === 'failed' ||
    overallRaw === 'partial'
      ? overallRaw
      : 'pending';
  return {
    audio_captured: step(row.audio_captured, 'pending'),
    transcription: step(row.transcription, 'pending'),
    analysis: step(row.analysis, 'pending'),
    image: step(row.image, 'pending'),
    overall,
    last_checked_at: typeof row.last_checked_at === 'string' ? row.last_checked_at : null,
    last_error: typeof row.last_error === 'string' ? row.last_error : null,
    attempts: typeof row.attempts === 'number' && Number.isFinite(row.attempts) ? row.attempts : 0,
  };
}

export function deriveDreamPipelineStatus(
  dream: PipelineDreamLike,
  previous?: DreamPipelineStatus | null,
): DreamPipelineStatus {
  const mode = (dream.captureMode || 'text').toLowerCase();
  const isMedia = mode === 'audio' || mode === 'video';
  const audioCaptured = isMedia
    ? hasPlayableRef(
        mediaRef(dream.audioCapture) || mediaRef(dream.videoCapture),
        dream.mediaStoragePath || dream.audioFile || dream.sourceAudio || null,
      )
      ? 'done'
      : 'pending'
    : 'skipped';

  const transcription: PipelineStepState = !isMedia
    ? 'skipped'
    : isTranscriptReady(dream)
      ? 'done'
      : previous?.transcription === 'error'
        ? 'error'
        : previous?.transcription === 'running'
          ? 'running'
          : 'pending';

  const analysis: PipelineStepState = isAnalysisReady(dream)
    ? 'done'
    : previous?.analysis === 'error'
      ? 'error'
      : previous?.analysis === 'running'
        ? 'running'
        : 'pending';

  const image: PipelineStepState = isDreamImageReady(dream)
    ? 'done'
    : previous?.image === 'error'
      ? 'error'
      : previous?.image === 'running'
        ? 'running'
        : 'pending';

  let overall = overallFromSteps({
    audio_captured: audioCaptured,
    transcription,
    analysis,
    image,
  });
  if (overall === 'pending' && dream.processingStatus === 'failed') overall = 'failed';
  if (overall === 'pending' && dream.processingStatus === 'processing') overall = 'processing';

  return {
    audio_captured: audioCaptured,
    transcription,
    analysis,
    image,
    overall,
    last_checked_at: previous?.last_checked_at ?? null,
    last_error: overall === 'complete' ? null : previous?.last_error ?? null,
    attempts: previous?.attempts ?? 0,
  };
}

export function missingPipelineSteps(status: DreamPipelineStatus): PipelineStepName[] {
  return PIPELINE_STEPS.filter((step) => {
    if (step === 'audio_captured') return false;
    const value = status[step];
    return value === 'pending' || value === 'error';
  });
}

export function pipelineNeedsWork(dream: PipelineDreamLike): boolean {
  if (dream.isSample) return false;
  const status = deriveDreamPipelineStatus(dream, dream.pipelineStatus);
  return missingPipelineSteps(status).length > 0;
}

export function rollupProcessingFields(status: DreamPipelineStatus): {
  processingStatus: 'processing' | 'complete' | 'failed';
  processingStep: 'transcribe' | 'analyse' | 'image' | 'complete';
} {
  if (status.overall === 'complete') {
    return { processingStatus: 'complete', processingStep: 'complete' };
  }
  if (status.overall === 'failed') {
    const step =
      status.transcription === 'error'
        ? 'transcribe'
        : status.analysis === 'error'
          ? 'analyse'
          : 'image';
    return { processingStatus: 'failed', processingStep: step };
  }
  const step =
    status.transcription === 'pending' || status.transcription === 'running'
      ? 'transcribe'
      : status.analysis === 'pending' || status.analysis === 'running'
        ? 'analyse'
        : status.image === 'pending' || status.image === 'running'
          ? 'image'
          : 'complete';
  return { processingStatus: 'processing', processingStep: step };
}

export function pipelineProgressSteps(status: DreamPipelineStatus): Array<{
  name: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
}> {
  return [
    { name: 'Audio captured', status: status.audio_captured },
    { name: 'Transcription', status: status.transcription },
    { name: 'Dream analysis', status: status.analysis },
    { name: 'Image generation', status: status.image },
  ];
}

function overallFromSteps(status: Pick<DreamPipelineStatus, PipelineStepName>): PipelineOverall {
  const actionable: PipelineStepState[] = [
    status.audio_captured,
    status.transcription,
    status.analysis,
    status.image,
  ].filter((step) => step !== 'skipped');
  if (actionable.every((step) => step === 'done')) return 'complete';
  if (actionable.some((step) => step === 'running')) return 'processing';
  if (actionable.some((step) => step === 'error') && actionable.some((step) => step === 'done')) {
    return 'partial';
  }
  if (actionable.some((step) => step === 'error')) return 'failed';
  if (actionable.some((step) => step === 'done')) return 'partial';
  return 'pending';
}

export function markPipelineStep(
  status: DreamPipelineStatus,
  step: PipelineStepName,
  state: PipelineStepState,
  error?: string | null,
): DreamPipelineStatus {
  const next: DreamPipelineStatus = {
    ...status,
    [step]: state,
    last_checked_at: new Date().toISOString(),
    last_error: status.last_error,
    attempts: status.attempts,
  };
  if (state === 'error') {
    next.last_error = error || `${step} failed`;
    next.attempts = (status.attempts || 0) + 1;
  }
  if (state === 'done' && status.last_error?.toLowerCase().includes(step.replace('_', ' '))) {
    next.last_error = null;
  }
  next.overall = overallFromSteps(next);
  return next;
}

export function withPipelineBookkeeping(
  status: DreamPipelineStatus,
  error?: string | null,
): DreamPipelineStatus {
  return {
    ...status,
    last_checked_at: new Date().toISOString(),
    last_error: error ?? (status.overall === 'complete' ? null : status.last_error),
    attempts: (status.attempts || 0) + 1,
  };
}

export function pipelineCatchupDue(status: DreamPipelineStatus, intervalMs: number, now = Date.now()): boolean {
  if (missingPipelineSteps(status).length === 0) return false;
  if (!status.last_checked_at) return true;
  const last = Date.parse(status.last_checked_at);
  if (!Number.isFinite(last)) return true;
  return now - last >= intervalMs;
}
