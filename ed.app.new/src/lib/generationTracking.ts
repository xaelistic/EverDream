/**
 * Persist quality checks, generation jobs, and asset feedback.
 */

import { supabase, getProfile } from './supabase/client';
import { cloudIdForDream } from './dreamsRecord';
import type { ImageQualityReport } from './imageQuality';
import type { VideoRoute } from './modelRouting';

export type TrackedAssetKind = 'still' | 'storyboard' | 'video';
export type TrackedJobKind = 'image' | 'storyboard' | 'video';

async function profileId(): Promise<string | null> {
  const profile = await getProfile();
  const id = profile?.id;
  return typeof id === 'string' ? id : null;
}

function dreamUuid(dreamId?: string | null): string | null {
  if (!dreamId) return null;
  return cloudIdForDream(dreamId);
}

export async function logQualityCheck(opts: {
  dreamId?: string;
  jobId?: string;
  assetKind: TrackedAssetKind;
  report: ImageQualityReport;
}): Promise<string | null> {
  const userId = await profileId();
  if (!userId) return null;
  const { data, error } = await supabase.from('asset_quality_checks').insert({
    user_id: userId,
    dream_id: dreamUuid(opts.dreamId),
    job_id: opts.jobId || null,
    asset_kind: opts.assetKind,
    asset_url: opts.report.url,
    score: opts.report.score,
    verdict: opts.report.verdict,
    metrics: opts.report.metrics,
    reasons: opts.report.reasons,
  }).select('id').single();
  if (error) {
    console.warn('[Tracking] quality check:', error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function startGenerationJob(opts: {
  dreamId?: string;
  kind: TrackedJobKind;
  model?: string;
  fallbackModel?: string;
  routedReason?: string;
  qualityScore?: number;
  qualityVerdict?: string;
  qualityReport?: ImageQualityReport | null;
  prompt?: string;
  sourceUrls?: string[];
}): Promise<string | null> {
  const userId = await profileId();
  if (!userId) return null;
  const { data, error } = await supabase.from('generation_jobs').insert({
    user_id: userId,
    dream_id: dreamUuid(opts.dreamId),
    kind: opts.kind,
    model: opts.model || null,
    fallback_model: opts.fallbackModel || null,
    routed_reason: opts.routedReason || null,
    quality_score: opts.qualityScore ?? null,
    quality_verdict: opts.qualityVerdict || null,
    quality_report: opts.qualityReport || null,
    prompt: opts.prompt || null,
    source_urls: opts.sourceUrls || [],
    status: opts.routedReason === 'blocked-poor-stills' ? 'blocked' : 'processing',
    provider: 'openrouter',
  }).select('id').single();
  if (error) {
    console.warn('[Tracking] start job:', error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function finishGenerationJob(opts: {
  jobId?: string | null;
  status: 'completed' | 'failed' | 'blocked';
  resultUrl?: string | null;
  error?: string | null;
  costUsd?: number | null;
  model?: string | null;
}): Promise<void> {
  if (!opts.jobId) return;
  const { error } = await supabase.from('generation_jobs').update({
    status: opts.status,
    result_url: opts.resultUrl || null,
    error: opts.error || null,
    cost_usd: opts.costUsd ?? null,
    model: opts.model || undefined,
    completed_at: new Date().toISOString(),
  }).eq('id', opts.jobId);
  if (error) console.warn('[Tracking] finish job:', error.message);
}

export async function logAssetFeedback(opts: {
  dreamId?: string;
  jobId?: string | null;
  assetKind: TrackedAssetKind;
  assetUrl?: string;
  model?: string;
  rating: 1 | -1;
  tags?: string[];
  comment?: string;
}): Promise<boolean> {
  const userId = await profileId();
  if (!userId) return false;
  const { error } = await supabase.from('asset_feedback').insert({
    user_id: userId,
    dream_id: dreamUuid(opts.dreamId),
    job_id: opts.jobId || null,
    asset_kind: opts.assetKind,
    asset_url: opts.assetUrl || null,
    model: opts.model || null,
    rating: opts.rating,
    tags: opts.tags || [],
    comment: opts.comment || null,
  });
  if (error) {
    console.warn('[Tracking] feedback:', error.message);
    return false;
  }
  return true;
}

export async function recentNegativeVideoFeedback(days = 14): Promise<boolean> {
  const userId = await profileId();
  if (!userId) return false;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('asset_feedback')
    .select('id')
    .eq('user_id', userId)
    .eq('asset_kind', 'video')
    .eq('rating', -1)
    .gte('created_at', since)
    .limit(1);
  if (error) {
    console.warn('[Tracking] recent feedback:', error.message);
    return false;
  }
  return Boolean(data?.length);
}

export function routeNotes(route: VideoRoute): string {
  return `${route.model} · ${route.reason}`;
}
