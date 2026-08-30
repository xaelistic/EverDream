import { describe, expect, it } from 'vitest';
import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  isAllowedVideoModel,
  routeImageModel,
  routeVideoModel,
} from './modelRouting';
import { scoreImageMetrics } from './imageQuality';

describe('image model routing', () => {
  it('uses the cheap Flux still for ordinary hero images', () => {
    expect(routeImageModel({ intent: 'hero' })).toMatchObject({
      model: IMAGE_MODELS.cheap,
      reason: 'default-cheap',
    });
  });

  it('routes storyboards and quality requests to the flex model', () => {
    expect(routeImageModel({ intent: 'storyboard' }).model).toBe(IMAGE_MODELS.quality);
    expect(routeImageModel({ quality: 'quality' }).reason).toBe('storyboard-or-quality');
  });

  it('routes in-world text to the text-capable model unless overlays are banned', () => {
    expect(routeImageModel({ needsReadableText: true }).model).toBe(IMAGE_MODELS.text);
    expect(routeImageModel({ needsReadableText: true, noOverlayText: true }).model).toBe(IMAGE_MODELS.cheap);
  });

  it('honours an explicit OpenRouter slug', () => {
    expect(routeImageModel({ requested: 'black-forest-labs/flux.2-flex' }).reason).toBe('explicit-override');
  });
});

describe('video model routing', () => {
  const pass = scoreImageMetrics({
    width: 1024,
    height: 1024,
    sharpness: 0.7,
    contrast: 0.5,
    brightness: 0.45,
    https: true,
  });
  const warn = scoreImageMetrics({
    width: 1024,
    height: 1024,
    sharpness: 0.15,
    contrast: 0.25,
    brightness: 0.4,
    https: true,
  });
  const fail = scoreImageMetrics({
    width: 240,
    height: 240,
    sharpness: 0.05,
    contrast: 0.05,
    brightness: 0.5,
    https: false,
  });

  it('blocks clips when stills fail the quality gate', () => {
    const route = routeVideoModel({ imageQuality: fail, length: 'medium' });
    expect(route.blocked).toBe(true);
    expect(route.reason).toBe('blocked-poor-stills');
  });

  it('uses the fast Seedance path for clean medium dreams', () => {
    const route = routeVideoModel({ imageQuality: pass, length: 'medium' });
    expect(route.blocked).toBe(false);
    expect(route.model).toBe(VIDEO_MODELS.fast);
    expect(route.fallback).toBe(VIDEO_MODELS.fallback);
    expect(route.duration).toBe(6);
    expect(route.resolution).toBe('720p');
  });

  it('upgrades soft stills and long dreams to the quality video model', () => {
    expect(routeVideoModel({ imageQuality: warn, length: 'medium' }).model).toBe(VIDEO_MODELS.quality);
    const long = routeVideoModel({ imageQuality: pass, length: 'long' });
    expect(long.model).toBe(VIDEO_MODELS.quality);
    expect(long.duration).toBe(8);
    expect(long.resolution).toBe('1080p');
  });

  it('upgrades after recent negative clip feedback', () => {
    const route = routeVideoModel({
      imageQuality: pass,
      length: 'medium',
      recentNegativeVideo: true,
    });
    expect(route.model).toBe(VIDEO_MODELS.quality);
    expect(route.reason).toBe('recent-negative-feedback');
  });

  it('only accepts allowlisted video slugs', () => {
    expect(isAllowedVideoModel('bytedance/seedance-2.0-fast')).toBe(true);
    expect(isAllowedVideoModel('evil/steal-the-dream')).toBe(false);
    expect(routeVideoModel({ requested: 'evil/x', imageQuality: pass }).model).toBe(VIDEO_MODELS.fast);
  });
});
