/**
 * Model routing for stills and image-to-video.
 * Keep in sync with generate-image / generate-video defaults.
 */

import type { DreamNarrativeLength } from './dreamLength';
import { clipDurationSeconds } from './dreamLength';
import type { ImageQualityReport, ImageQualityVerdict } from './imageQuality';

export const IMAGE_MODELS = {
  cheap: 'black-forest-labs/flux.2-klein-4b',
  quality: 'black-forest-labs/flux.2-flex',
  text: 'black-forest-labs/flux.2-flex',
} as const;

export const VIDEO_MODELS = {
  fast: 'bytedance/seedance-2.0-fast',
  quality: 'bytedance/seedance-2.0',
  fallback: 'alibaba/wan-2.6',
} as const;

export const VIDEO_MODEL_ALLOWLIST = [
  VIDEO_MODELS.fast,
  VIDEO_MODELS.quality,
  VIDEO_MODELS.fallback,
  'alibaba/wan-2.7',
  'google/veo-3.1-lite',
  'bytedance/seedance-2.0-fast',
] as const;

export type ImageRouteIntent = 'hero' | 'storyboard' | 'text';

export interface ImageRouteInput {
  intent?: ImageRouteIntent;
  quality?: 'cheap' | 'quality';
  needsReadableText?: boolean;
  noOverlayText?: boolean;
  requested?: string;
}

export interface ImageRoute {
  model: string;
  reason: string;
  quality: 'cheap' | 'quality';
}

export interface VideoRouteInput {
  imageQuality?: ImageQualityVerdict | ImageQualityReport | null;
  length?: DreamNarrativeLength;
  recentNegativeVideo?: boolean;
  requested?: string;
}

export interface VideoRoute {
  model: string;
  fallback: string;
  reason: string;
  duration: number;
  resolution: '720p' | '1080p';
  blocked: boolean;
  blockReason?: string;
}

const MODEL_SLUG = /^[\w.-]+\/[\w.-]+$/;

export function isAllowedVideoModel(model?: string | null): boolean {
  return Boolean(model && (VIDEO_MODEL_ALLOWLIST as readonly string[]).includes(model));
}

export function routeImageModel(input: ImageRouteInput = {}): ImageRoute {
  if (input.requested && MODEL_SLUG.test(input.requested)) {
    return { model: input.requested, reason: 'explicit-override', quality: 'quality' };
  }
  const needsText = Boolean(input.needsReadableText) && !input.noOverlayText;
  if (needsText) {
    return { model: IMAGE_MODELS.text, reason: 'readable-inworld-text', quality: 'quality' };
  }
  if (input.intent === 'storyboard' || input.quality === 'quality') {
    return { model: IMAGE_MODELS.quality, reason: 'storyboard-or-quality', quality: 'quality' };
  }
  return { model: IMAGE_MODELS.cheap, reason: 'default-cheap', quality: 'cheap' };
}

function verdictOf(quality?: VideoRouteInput['imageQuality']): ImageQualityVerdict | null {
  if (!quality) return null;
  if (typeof quality === 'string') return quality;
  return quality.verdict;
}

export function routeVideoModel(input: VideoRouteInput = {}): VideoRoute {
  const fallback = VIDEO_MODELS.fallback;
  const length = input.length || 'medium';
  const duration = clipDurationSeconds(length);
  const verdict = verdictOf(input.imageQuality);

  if (verdict === 'fail') {
    return {
      model: VIDEO_MODELS.fast,
      fallback,
      reason: 'blocked-poor-stills',
      duration,
      resolution: '720p',
      blocked: true,
      blockReason: 'Source stills are not sharp enough for a clip.',
    };
  }

  if (input.requested && isAllowedVideoModel(input.requested)) {
    return {
      model: input.requested,
      fallback,
      reason: 'explicit-override',
      duration,
      resolution: length === 'long' ? '1080p' : '720p',
      blocked: false,
    };
  }

  if (input.recentNegativeVideo || verdict === 'warn' || length === 'long') {
    const reason = input.recentNegativeVideo
      ? 'recent-negative-feedback'
      : verdict === 'warn'
        ? 'soft-stills-quality-model'
        : 'long-dream-quality-model';
    return {
      model: VIDEO_MODELS.quality,
      fallback,
      reason,
      duration,
      resolution: length === 'long' ? '1080p' : '720p',
      blocked: false,
    };
  }

  return {
    model: VIDEO_MODELS.fast,
    fallback,
    reason: 'default-fast',
    duration,
    resolution: '720p',
    blocked: false,
  };
}
