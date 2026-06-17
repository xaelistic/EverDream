/**
 * PostHog Analytics Client
 *
 * Lightweight wrapper around posthog-js. Handles:
 * - Initialization with privacy-first config
 * - User identification
 * - Event tracking (alongside existing custom analytics)
 * - Session recording (masked inputs for privacy)
 *
 * This does NOT replace the custom analytics system (src/lib/analytics.ts).
 * The custom system handles dream-specific tracking, performance metrics,
 * heatmaps, and pain point detection. PostHog handles product analytics:
 * funnels, retention, cohorts, session replay, feature flags.
 *
 * Environment variables needed:
 *   VITE_POSTHOG_KEY=phc_YOUR_PROJECT_API_KEY
 *   VITE_POSTHOG_HOST=https://posthog.yourdomain.com
 */

import posthog from 'posthog-js';

let initialized = false;

export function initPosthog(): void {
  if (initialized) return;

  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST;

  if (!key || !host) {
    console.log('[PostHog] Not configured — skipping (set VITE_POSTHOG_KEY and VITE_POSTHOG_HOST in .env)');
    return;
  }

  posthog.init(key, {
    api_host: host,

    // Privacy-first config
    persistence: 'localStorage',
    capture_pageview: true,
    capture_pageleave: true,

    // Session recording — mask all inputs for privacy
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
    },

    // Performance — batch events to reduce network overhead
    request_batching: true,
    batch_size: 10,
    batch_flush_interval_ms: 5000,

    // Respect do-not-track
    respect_dnt: true,

    // Dev mode: opt out
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        ph.opt_out_capturing();
        console.log('[PostHog] Dev mode — opted out of capturing');
      }
    },
  });

  initialized = true;
  console.log('[PostHog] Initialized');
}

/**
 * Identify a user (call after login/signup)
 */
export function identifyPosthog(userId: string, properties?: Record<string, any>): void {
  if (!initialized) return;
  posthog.identify(userId, properties);
}

/**
 * Track a custom event
 * Use for key product events: dream_saved, dream_shared, image_generated, etc.
 */
export function trackPosthogEvent(event: string, properties?: Record<string, any>): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

/**
 * Reset on logout
 */
export function resetPosthog(): void {
  if (!initialized) return;
  posthog.reset();
}

/**
 * Opt out (for privacy settings)
 */
export function optOutPosthog(): void {
  if (!initialized) return;
  posthog.opt_out_capturing();
}

/**
 * Opt back in
 */
export function optInPosthog(): void {
  if (!initialized) return;
  posthog.opt_in_capturing();
}

/**
 * Check if PostHog is enabled
 */
export function isPosthogEnabled(): boolean {
  return initialized;
}

// Re-export for direct access if needed
export { posthog };
