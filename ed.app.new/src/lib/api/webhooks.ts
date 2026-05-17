/**
 * n8n Webhook Integration
 *
 * Dispatches events to n8n workflows for automation.
 * Events are queued locally and sent in batches for reliability.
 *
 * Environment variable:
 *   VITE_N8N_WEBHOOK_URL=https://YOUR_N8N_URL/webhook
 *
 * n8n workflows to create:
 *   1. "dream-created"    - Triggered when a dream is saved
 *   2. "dream-analyzed"   - Triggered when AI analysis completes
 *   3. "sleep-completed"  - Triggered when a sleep session ends
 *   4. "morning-checkin"  - Triggered on morning check-in
 *   5. "weekly-insights"  - Triggered for weekly pattern analysis
 *   6. "user-onboarded"   - Triggered on first dream capture
 */

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';
const N8N_API_KEY = import.meta.env.VITE_N8N_API_KEY || '';

// ============================================================
// EVENT TYPES
// ============================================================

export type N8nEventType =
  | 'dream.created'
  | 'dream.analyzed'
  | 'dream.shared'
  | 'dream.deleted'
  | 'sleep.session_started'
  | 'sleep.session_completed'
  | 'sleep.morning_checkin'
  | 'user.onboarded'
  | 'user.weekly_insights'
  | 'sync.conflict';

export interface N8nEvent {
  type: N8nEventType;
  userId?: string;
  deviceId?: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

// ============================================================
// WEBHOOK DISPATCH
// ============================================================

export async function dispatchN8nEvent(event: N8nEvent): Promise<boolean> {
  if (!N8N_WEBHOOK_URL) {
    console.log('[n8n] Webhook URL not configured, skipping event:', event.type);
    return false;
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(N8N_API_KEY ? { 'X-N8N-API-KEY': N8N_API_KEY } : {}),
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error('[n8n] Webhook failed:', response.status, await response.text());
      return false;
    }

    console.log('[n8n] Event dispatched:', event.type);
    return true;
  } catch (err) {
    console.error('[n8n] Webhook error:', err);
    return false;
  }
}

// ============================================================
// CONVENIENCE HELPERS
// ============================================================

export async function notifyDreamCreated(dream: Record<string, unknown>, userId?: string): Promise<boolean> {
  return dispatchN8nEvent({
    type: 'dream.created',
    userId,
    deviceId: dream.device_id as string,
    timestamp: new Date().toISOString(),
    payload: {
      dreamId: dream.id,
      category: dream.category,
      themes: dream.themes,
      emotion: dream.emotion,
      captureMode: dream.capture_mode,
      lucidityLevel: dream.lucidity_level,
      hasImage: !!dream.generated_image_url,
      wordCount: (dream.content as string || '').split(/\s+/).length,
    },
  });
}

export async function notifyDreamAnalyzed(dream: Record<string, unknown>, userId?: string): Promise<boolean> {
  return dispatchN8nEvent({
    type: 'dream.analyzed',
    userId,
    timestamp: new Date().toISOString(),
    payload: {
      dreamId: dream.id,
      category: dream.category,
      themes: dream.themes,
      emotion: dream.emotion,
      nugget: dream.nugget,
      aiConfidence: dream.ai_confidence,
      interpretation: dream.interpretation,
    },
  });
}

export async function notifyDreamShared(dream: Record<string, unknown>, userId?: string): Promise<boolean> {
  return dispatchN8nEvent({
    type: 'dream.shared',
    userId,
    timestamp: new Date().toISOString(),
    payload: {
      dreamId: dream.id,
      visibility: dream.visibility,
      platform: dream.share_platform,
    },
  });
}

export async function notifySleepSessionCompleted(session: Record<string, unknown>, userId?: string): Promise<boolean> {
  return dispatchN8nEvent({
    type: 'sleep.session_completed',
    userId,
    timestamp: new Date().toISOString(),
    payload: {
      sessionId: session.id,
      sleepStart: session.sleep_start,
      sleepEnd: session.sleep_end,
      totalSleepMinutes: session.total_sleep_minutes,
      deepMinutes: session.deep_minutes,
      remMinutes: session.rem_minutes,
      efficiency: session.sleep_efficiency,
      score: session.algorithmic_score,
      source: session.source,
      wearableProvider: session.wearable_provider,
    },
  });
}

export async function notifyMorningCheckIn(
  session: Record<string, unknown>,
  checkIn: { restednessScore: number; comment?: string },
  userId?: string
): Promise<boolean> {
  return dispatchN8nEvent({
    type: 'sleep.morning_checkin',
    userId,
    timestamp: new Date().toISOString(),
    payload: {
      sessionId: session.id,
      restednessScore: checkIn.restednessScore,
      comment: checkIn.comment,
      algorithmicScore: session.algorithmic_score,
      calibratedScore: session.calibrated_score,
      calibrationOffset: session.calibration_offset,
    },
  });
}

export async function notifyUserOnboarded(userId: string, deviceId?: string): Promise<boolean> {
  return dispatchN8nEvent({
    type: 'user.onboarded',
    userId,
    deviceId,
    timestamp: new Date().toISOString(),
    payload: {
      onboardingComplete: true,
    },
  });
}

export async function notifyWeeklyInsights(
  userId: string,
  insights: {
    totalDreams: number;
    avgSleepScore: number;
    topThemes: string[];
    avgLucidity: number;
    streakDays: number;
  }
): Promise<boolean> {
  return dispatchN8nEvent({
    type: 'user.weekly_insights',
    userId,
    timestamp: new Date().toISOString(),
    payload: insights,
  });
}

// ============================================================
// BATCH DISPATCH (for sync scenarios)
// ============================================================

export async function dispatchBatch(events: N8nEvent[]): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const event of events) {
    const success = await dispatchN8nEvent(event);
    if (success) {
      sent++;
    } else {
      failed++;
    }

    // Small delay to avoid rate limiting
    if (events.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { sent, failed };
}
