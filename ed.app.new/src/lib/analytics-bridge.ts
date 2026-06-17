/**
 * Analytics Bridge
 *
 * Sends key events to BOTH the custom analytics system (Supabase)
 * and PostHog. This is a thin wrapper — the custom analytics system
 * continues to handle all the heavy lifting (localStorage, performance,
 * heatmaps, pain points, funnels). This just forwards the important
 * product events to PostHog for funnels, retention, and session replay.
 *
 * Usage: Import and call these instead of trackEvent() for events
 * you want in PostHog. For everything else, keep using trackEvent().
 */

import { trackEvent } from './analytics';
import { trackPosthogEvent } from './posthog';

/**
 * Track an event in both systems
 */
export function trackEventDual(
  type: string,
  name: string,
  properties?: Record<string, any>,
  screen?: string,
): void {
  // Always track in custom analytics
  trackEvent(type as any, name, properties, screen);

  // Also send to PostHog (mapped to PostHog event names)
  const posthogEvent = mapToPosthogEvent(type, name);
  if (posthogEvent) {
    trackPosthogEvent(posthogEvent, {
      ...properties,
      screen: screen || properties?.screen,
    });
  }
}

/**
 * Map internal event types to PostHog event names
 * Only map events that are useful for product analytics
 */
function mapToPosthogEvent(type: string, name: string): string | null {
  // Session events
  if (name === 'session_start') return 'session_started';
  if (name === 'session_end') return 'session_ended';

  // Screen views — strip 'screen_' prefix
  if (type === 'screen_view') return name.replace(/^screen_/, '');

  // Dream events
  if (name.includes('dream_save')) return 'dream_saved';
  if (name.includes('dream_share')) return 'dream_shared';
  if (name.includes('dream_record')) return 'dream_recorded';
  if (name.includes('dream_view')) return 'dream_viewed';

  // Image generation
  if (name.includes('image_gen')) return 'image_generated';

  // Sleep
  if (name.includes('sleep_start')) return 'sleep_session_started';
  if (name.includes('sleep_end')) return 'sleep_session_ended';
  if (name.includes('morning_checkin')) return 'morning_checkin_completed';

  // Onboarding
  if (name.includes('terms_accept')) return 'onboarding_terms_accepted';
  if (name.includes('onboarding_complete')) return 'onboarding_completed';

  // Sharing
  if (name.includes('share')) return 'content_shared';

  // NFT
  if (name.includes('nft_mint')) return 'nft_minted';

  // Funnel completions
  if (type === 'funnel_complete') return 'funnel_completed';
  if (type === 'funnel_drop') return 'funnel_dropped';

  // Don't send everything to PostHog — keep it focused on product events
  return null;
}

/**
 * Convenience helpers for common dual-tracked events
 */
export function trackDreamSaved(properties?: Record<string, any>): void {
  trackEventDual('custom', 'dream_save', properties);
}

export function trackDreamShared(platform: string, properties?: Record<string, any>): void {
  trackEventDual('custom', 'dream_share', { platform, ...properties });
}

export function trackImageGenerated(source: string, style: string, properties?: Record<string, any>): void {
  trackEventDual('custom', 'image_generated', { source, style, ...properties });
}

export function trackSleepSessionStarted(properties?: Record<string, any>): void {
  trackEventDual('custom', 'sleep_start', properties);
}

export function trackMorningCheckin(properties?: Record<string, any>): void {
  trackEventDual('custom', 'morning_checkin', properties);
}

export function trackOnboardingComplete(properties?: Record<string, any>): void {
  trackEventDual('custom', 'onboarding_complete', properties);
}

export function trackNFTMinted(tokenId: string, properties?: Record<string, any>): void {
  trackEventDual('custom', 'nft_mint', { token_id: tokenId, ...properties });
}
