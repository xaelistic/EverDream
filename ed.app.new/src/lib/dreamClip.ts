/**
 * Client for dream clips — real image-to-video from storyboard frames.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DreamScene } from './dreamScenes';
import { clipDurationSeconds, type DreamNarrativeLength } from './dreamLength';

export interface DreamClipResult {
  url: string;
  source: string;
  model?: string;
  costUsd?: number | null;
}

function getSupabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key || url.includes('placeholder')) return null;
  return createClient(url, key);
}

export function buildDreamClipPrompt(scenes: DreamScene[], narrative?: string): string {
  const beats = scenes
    .map((scene, index) => `Beat ${index + 1}: ${(scene.caption || scene.summary || scene.prompt).slice(0, 160)}`)
    .join(' ');
  const body = beats || String(narrative || '').slice(0, 400);
  return `${body} The dream moves forward through these beats in one short clip.`;
}

function isPublicHttps(url?: string | null): boolean {
  return Boolean(url && /^https:\/\//i.test(url) && !url.includes('blob:'));
}

async function invoke(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.functions.invoke('generate-video', { body });
    if (!error && data) return data as Record<string, unknown>;
    if (error) console.warn('[DreamClip] invoke failed:', error.message);
  }

  const url = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) throw new Error('Supabase is not configured for video generation.');
  const response = await fetch(`${url}/functions/v1/generate-video`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok && response.status !== 202) {
    throw new Error(String(payload.error || `Video generation failed (${response.status})`));
  }
  return payload;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateDreamClip(opts: {
  scenes: DreamScene[];
  narrative?: string;
  firstFrameUrl: string;
  lastFrameUrl?: string;
  length: DreamNarrativeLength;
  model?: string;
  duration?: number;
  resolution?: '720p' | '1080p';
  dreamId?: string;
  qualityScore?: number;
  routedReason?: string;
  onStatus?: (message: string) => void;
}): Promise<DreamClipResult> {
  if (!isPublicHttps(opts.firstFrameUrl)) {
    throw new Error('The storyboard still needs to finish uploading before we can animate it.');
  }

  opts.onStatus?.('Sending the storyboard to the clip model…');
  let payload = await invoke({
    prompt: buildDreamClipPrompt(opts.scenes, opts.narrative),
    firstFrameUrl: opts.firstFrameUrl,
    lastFrameUrl: isPublicHttps(opts.lastFrameUrl) ? opts.lastFrameUrl : undefined,
    duration: opts.duration ?? clipDurationSeconds(opts.length),
    aspectRatio: '1:1',
    resolution: opts.resolution || '720p',
    model: opts.model,
    dreamId: opts.dreamId,
    qualityScore: opts.qualityScore,
    routedReason: opts.routedReason,
  });

  let guard = 0;
  while ((payload.status === 'processing' || payload.status === 'pending' || payload.status === 'in_progress') && guard < 24) {
    opts.onStatus?.('Rendering the dream clip…');
    await sleep(5000);
    payload = await invoke({
      jobId: payload.jobId,
      pollingUrl: payload.pollingUrl,
    });
    guard += 1;
  }

  if (payload.status === 'failed' || payload.error) {
    throw new Error(String(payload.error || 'Video generation failed.'));
  }
  const videoUrl = typeof payload.videoUrl === 'string' ? payload.videoUrl : '';
  if (!videoUrl) throw new Error('The clip finished but no video URL was returned. Try again in a moment.');

  return {
    url: videoUrl,
    source: String(payload.source || 'openrouter'),
    model: typeof payload.model === 'string' ? payload.model : undefined,
    costUsd: typeof payload.cost_usd === 'number' ? payload.cost_usd : null,
  };
}
