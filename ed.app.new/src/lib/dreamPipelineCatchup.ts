/**
 * Dream pipeline listener + hourly catch-up.
 *
 * - Derives per-step status (audio, transcription, analysis, image)
 * - Subscribes to Supabase realtime so the journal updates when a step finishes
 * - Every hour (and on launch) fills in any missing transcription / analysis / image
 */

import { supabase } from './supabase/client';
import { fromDreamsRow } from './dreamsRecord';
import { persistUserMedia } from './mediaPersist';
import { analyzeDream } from './dream-analyzer';
import { generateDreamImage } from '../modules/sleep/dreamAssetGenerator';
import { detectDreamScenes } from './dreamScenes';
import { deriveDreamTitle } from './dreamClassify';
import {
  deriveDreamPipelineStatus,
  missingPipelineSteps,
  pipelineCatchupDue,
  pipelineNeedsWork,
  rollupProcessingFields,
  withPipelineBookkeeping,
  type DreamPipelineStatus,
  type PipelineDreamLike,
} from './dreamPipelineStatus';
import { reprocessStuckMediaDream } from './stuckDreamProcessor';
import { isStuckJournalDream, type JournalMediaDream } from './audioJournal';

export const PIPELINE_CATCHUP_INTERVAL_MS = 60 * 60 * 1000;

export type CatchupDream = PipelineDreamLike & {
  id: string;
  [key: string]: unknown;
};

export interface DreamPipelineCatchupHandlers {
  getDreams: () => CatchupDream[];
  applyDream: (id: string, patch: Record<string, unknown>) => void;
}

type CatchupListener = (pendingCount: number) => void;

const inFlight = new Set<string>();
const listeners = new Set<CatchupListener>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let running = false;
let lastRunAt: string | null = null;
let lastResult: { completed: number; failed: number; skipped: number } | null = null;

export function subscribePipelineCatchup(listener: CatchupListener): () => void {
  listeners.add(listener);
  listener(countIncomplete(undefined));
  return () => listeners.delete(listener);
}

function notifyListeners(dreams?: CatchupDream[]): void {
  const count = countIncomplete(dreams);
  listeners.forEach((fn) => fn(count));
}

export function countIncomplete(dreams?: CatchupDream[]): number {
  const list = dreams ?? [];
  return list.filter((dream) => pipelineNeedsWork(dream)).length;
}

function pipelinePatch(dream: CatchupDream, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const merged = { ...dream, ...extra } as CatchupDream;
  const status = withPipelineBookkeeping(
    deriveDreamPipelineStatus(merged, (extra.pipelineStatus as DreamPipelineStatus) || dream.pipelineStatus),
  );
  const rollup = rollupProcessingFields(status);
  return {
    ...extra,
    pipelineStatus: status,
    processingStatus: rollup.processingStatus,
    processingStep: rollup.processingStep,
  };
}

async function persistInlineImage(
  dreamId: string,
  image: { url?: string; prompt?: string; style?: string; source?: string } | null,
): Promise<{ url?: string; prompt?: string; style?: string; source?: string } | null> {
  if (!image?.url?.startsWith('data:')) return image;
  try {
    const stored = await persistUserMedia({
      blob: await (await fetch(image.url)).blob(),
      kind: 'image',
      dreamId,
    });
    if (stored?.url) return { ...image, url: stored.url };
  } catch (err) {
    console.warn('[PipelineCatchup] image persist failed:', err);
  }
  return image;
}

function isRecentlyProcessing(dream: CatchupDream): boolean {
  if (dream.processingStatus !== 'processing') return false;
  const created = Date.parse(String(dream.date || ''));
  if (!Number.isFinite(created)) return false;
  return Date.now() - created < 10 * 60 * 1000;
}

export async function completeMissingPipelineSteps(dream: CatchupDream): Promise<Record<string, unknown> | null> {
  if (!dream?.id || dream.isSample || isRecentlyProcessing(dream)) return null;
  const status = deriveDreamPipelineStatus(dream, dream.pipelineStatus);
  const missing = missingPipelineSteps(status);
  if (missing.length === 0) return null;
  if (inFlight.has(dream.id)) return null;
  inFlight.add(dream.id);

  try {
    const isMedia = dream.captureMode === 'audio' || dream.captureMode === 'video'
      || Boolean(dream.audioCapture) || Boolean(dream.videoCapture);

    if (missing.includes('transcription') && isMedia && isStuckJournalDream({
      processingStatus: dream.processingStatus || undefined,
      content: typeof dream.content === 'string' ? dream.content : undefined,
      narrative: typeof dream.narrative === 'string' ? dream.narrative : undefined,
      nugget: typeof dream.nugget === 'string' ? dream.nugget : undefined,
    })) {
      const processed = await reprocessStuckMediaDream(dream as unknown as JournalMediaDream);
      if (processed) {
        return pipelinePatch(dream, processed as Record<string, unknown>);
      }
    }

    const extra: Record<string, unknown> = {};

    if (missing.includes('analysis')) {
      const text = String(dream.content || dream.narrative || '').trim();
      if (text.length >= 10 && !/processing your/i.test(text)) {
        const analysis = await analyzeDream(text);
        extra.category = analysis.category;
        extra.themes = analysis.themes;
        extra.emotion = analysis.emotion;
        extra.symbols = analysis.symbols;
        extra.narrative = analysis.narrative;
        extra.nugget = analysis.nugget;
        extra.interpretation = analysis.interpretation;
        extra.moodValence = analysis.valence;
        extra.title = deriveDreamTitle(analysis.nugget, analysis.narrative || text);
        extra.scenes = detectDreamScenes(text || analysis.narrative);
      }
    }

    if (missing.includes('image')) {
      const prompt = String(
        extra.narrative || extra.nugget || dream.narrative || dream.nugget || dream.content || '',
      ).trim();
      if (prompt.length >= 10 && !/processing your/i.test(prompt)) {
        const asset = await generateDreamImage(prompt);
        extra.generatedImage = await persistInlineImage(dream.id, {
          url: asset.url,
          prompt: asset.prompt,
          style: asset.style,
          source: asset.source,
        });
      }
    }

    if (Object.keys(extra).length === 0) return null;
    return pipelinePatch(dream, extra);
  } finally {
    inFlight.delete(dream.id);
  }
}

async function invokeServerCatchup(): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('complete-dream-pipeline', {
      body: { source: 'client-hourly' },
    });
    if (error) console.warn('[PipelineCatchup] edge function:', error.message);
  } catch (err) {
    console.warn('[PipelineCatchup] edge function failed:', err);
  }
}

export async function runDreamPipelineCatchup(
  handlers?: DreamPipelineCatchupHandlers,
): Promise<{ completed: number; failed: number; skipped: number }> {
  if (running) return lastResult || { completed: 0, failed: 0, skipped: 0 };
  running = true;
  let completed = 0;
  let failed = 0;
  let skipped = 0;

  try {
    await invokeServerCatchup();
    const dreams = handlers?.getDreams() ?? [];
    for (const dream of dreams) {
      if (isRecentlyProcessing(dream)) {
        skipped += 1;
        continue;
      }
      const status = deriveDreamPipelineStatus(dream, dream.pipelineStatus);
      if (missingPipelineSteps(status).length === 0) continue;
      if (!pipelineCatchupDue(status, PIPELINE_CATCHUP_INTERVAL_MS / 2)) {
        skipped += 1;
        continue;
      }
      try {
        const patch = await completeMissingPipelineSteps(dream);
        if (!patch) {
          skipped += 1;
          continue;
        }
        handlers?.applyDream(dream.id, patch);
        completed += 1;
      } catch (err) {
        failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[PipelineCatchup] dream failed:', dream.id, message);
        handlers?.applyDream(
          dream.id,
          pipelinePatch(dream, {
            pipelineStatus: {
              ...status,
              last_checked_at: new Date().toISOString(),
              last_error: message,
              attempts: (status.attempts || 0) + 1,
            },
          }),
        );
      }
    }
  } finally {
    running = false;
    lastRunAt = new Date().toISOString();
    lastResult = { completed, failed, skipped };
    notifyListeners(handlers?.getDreams());
  }

  return lastResult;
}

function attachRealtime(handlers: DreamPipelineCatchupHandlers): void {
  if (realtimeChannel) return;
  try {
    realtimeChannel = supabase
      .channel('dream-pipeline-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dreams' },
        (payload) => {
          const row = (payload.new || payload.old) as Record<string, unknown> | undefined;
          if (!row) return;
          const hydrated = fromDreamsRow(row) as unknown as CatchupDream;
          if (!hydrated?.id) return;
          const local = handlers.getDreams().find((dream) => dream.id === hydrated.id);
          const merged = { ...(local || {}), ...hydrated } as CatchupDream;
          const status = deriveDreamPipelineStatus(merged, merged.pipelineStatus);
          const rollup = rollupProcessingFields(status);
          handlers.applyDream(hydrated.id, {
            ...hydrated,
            pipelineStatus: status,
            processingStatus: rollup.processingStatus,
            processingStep: rollup.processingStep,
          });
          if (pipelineNeedsWork(merged)) {
            completeMissingPipelineSteps(merged)
              .then((patch) => {
                if (patch) handlers.applyDream(hydrated.id, patch);
              })
              .catch((err) => console.warn('[PipelineCatchup] realtime fill failed:', err));
          }
        },
      )
      .subscribe();
  } catch (err) {
    console.warn('[PipelineCatchup] realtime subscribe failed:', err);
  }
}

export function startDreamPipelineCatchup(handlers: DreamPipelineCatchupHandlers): () => void {
  attachRealtime(handlers);
  runDreamPipelineCatchup(handlers).catch((err) => console.warn('[PipelineCatchup] startup:', err));
  if (!intervalId) {
    intervalId = setInterval(() => {
      runDreamPipelineCatchup(handlers).catch((err) => console.warn('[PipelineCatchup] hourly:', err));
    }, PIPELINE_CATCHUP_INTERVAL_MS);
  }
  return stopDreamPipelineCatchup;
}

export function stopDreamPipelineCatchup(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel).catch(() => undefined);
    realtimeChannel = null;
  }
}

export function isPipelineCatchupRunning(): boolean {
  return intervalId !== null;
}

export function getPipelineCatchupIntervalMs(): number {
  return PIPELINE_CATCHUP_INTERVAL_MS;
}

export function getPipelineCatchupLastRun(): string | null {
  return lastRunAt;
}

export function getPipelineCatchupLastResult(): { completed: number; failed: number; skipped: number } | null {
  return lastResult;
}
