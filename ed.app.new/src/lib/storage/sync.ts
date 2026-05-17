/**
 * Sync Engine: Local (IndexedDB) <-> Supabase
 *
 * Strategy: Local-first with background sync
 * 1. All writes go to IndexedDB first (instant, offline-capable)
* 2. Writes are queued in sync_queue
 * 3. Sync engine processes queue when online
 * 4. Conflicts resolved by last-write-wins (using local_updated_at)
 * 5. Periodic full sync for multi-device support
 */

import {
  supabase,
  fetchDreams,
  fetchSleepSessions,
  insertDream,
  updateDream,
  insertSleepSession,
  updateSleepSession,
  getCurrentUser,
  getProfile,
  type DreamRecord,
  type SleepSessionRecord,
} from '../supabase/client';
import {
  getSyncQueue,
  removeSyncQueueItem,
  localGetAllDreams,
  localGetAllSleepSessions,
  localSaveDream,
  localSaveSleepSession,
  localUpdateDream,
  localUpdateSleepSession,
  type LocalDream,
  type LocalSleepSession,
  type LocalSyncQueueItem,
} from './indexedDB';

const SYNC_INTERVAL_MS = 30_000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 5;

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

// ============================================================
// SYNC CONTROL
// ============================================================

export function startAutoSync(): void {
  if (syncIntervalId) return;
  console.log('[Sync] Starting auto-sync every', SYNC_INTERVAL_MS / 1000, 'seconds');
  syncIntervalId = setInterval(() => syncToRemote(), SYNC_INTERVAL_MS);
}

export function stopAutoSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('[Sync] Auto-sync stopped');
  }
}

export function isAutoSyncRunning(): boolean {
  return syncIntervalId !== null;
}

// ============================================================
// PUSH: Local -> Supabase
// ============================================================

export async function syncToRemote(): Promise<{ pushed: number; errors: number }> {
  if (isSyncing) return { pushed: 0, errors: 0 };
  isSyncing = true;

  let pushed = 0;
  let errors = 0;

  try {
    const user = await getCurrentUser();
    if (!user) {
      isSyncing = false;
      return { pushed: 0, errors: 0 };
    }

    const profile = await getProfile();
    if (!profile) {
      isSyncing = false;
      return { pushed: 0, errors: 0 };
    }

    const userId = profile.id as string;
    const queue = await getSyncQueue();

    for (const item of queue) {
      try {
        await processSyncItem(item, userId);
        if (item.id !== undefined) {
          await removeSyncQueueItem(item.id);
        }
        pushed++;
      } catch (err) {
        console.error('[Sync] Failed to process queue item:', item, err);
        errors++;

        // Update retry count
        if (item.attempts >= MAX_RETRY_ATTEMPTS) {
          console.warn('[Sync] Max retries reached for item, removing:', item);
          if (item.id !== undefined) {
            await removeSyncQueueItem(item.id);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Sync] syncToRemote error:', err);
    errors++;
  }

  isSyncing = false;

  if (pushed > 0 || errors > 0) {
    console.log(`[Sync] Push complete: ${pushed} pushed, ${errors} errors`);
  }

  return { pushed, errors };
}

async function processSyncItem(item: LocalSyncQueueItem, userId: string): Promise<void> {
  const payload = JSON.parse(item.payload);

  if (item.table_name === 'dreams') {
    if (item.operation === 'delete') {
      const { error } = await supabase.from('dreams').update({ is_deleted: true }).eq('id', item.record_id);
      if (error) throw error;
    } else if (item.operation === 'insert') {
      const remote = mapLocalDreamToRemote(payload as LocalDream, userId);
      const result = await insertDream(remote);
      if (!result) throw new Error('Insert dream failed');
      // Update local record with remote_id
      await localUpdateDream(item.record_id, { remote_id: result.id, sync_status: 'synced' });
    } else if (item.operation === 'update') {
      const remote = mapLocalDreamToRemote(payload as LocalDream, userId);
      await updateDream(payload.remote_id || item.record_id, remote);
      await localUpdateDream(item.record_id, { sync_status: 'synced' });
    }
  } else if (item.table_name === 'sleep_sessions') {
    if (item.operation === 'insert') {
      const remote = mapLocalSleepToRemote(payload as LocalSleepSession, userId);
      const result = await insertSleepSession(remote);
      if (!result) throw new Error('Insert sleep session failed');
      await localUpdateSleepSession(item.record_id, { remote_id: result.id, sync_status: 'synced' });
    } else if (item.operation === 'update') {
      const remote = mapLocalSleepToRemote(payload as LocalSleepSession, userId);
      await updateSleepSession(payload.remote_id || item.record_id, remote);
      await localUpdateSleepSession(item.record_id, { sync_status: 'synced' });
    }
  }
}

// ============================================================
// PULL: Supabase -> Local
// ============================================================

export async function syncFromRemote(): Promise<{ pulled: number; errors: number }> {
  let pulled = 0;
  let errors = 0;

  try {
    const user = await getCurrentUser();
    if (!user) return { pulled: 0, errors: 0 };

    const profile = await getProfile();
    if (!profile) return { pulled: 0, errors: 0 };

    const userId = profile.id as string;

    // Pull dreams
    const remoteDreams = await fetchDreams(userId, 500);
    for (const remote of remoteDreams) {
      try {
        await mergeRemoteDreamToLocal(remote);
        pulled++;
      } catch (err) {
        console.error('[Sync] Failed to merge dream:', remote.id, err);
        errors++;
      }
    }

    // Pull sleep sessions
    const remoteSessions = await fetchSleepSessions(userId, 500);
    for (const remote of remoteSessions) {
      try {
        await mergeRemoteSleepToLocal(remote);
        pulled++;
      } catch (err) {
        console.error('[Sync] Failed to merge sleep session:', remote.id, err);
        errors++;
      }
    }
  } catch (err) {
    console.error('[Sync] syncFromRemote error:', err);
    errors++;
  }

  if (pulled > 0 || errors > 0) {
    console.log(`[Sync] Pull complete: ${pulled} pulled, ${errors} errors`);
  }

  return { pulled, errors };
}

async function mergeRemoteDreamToLocal(remote: DreamRecord): Promise<void> {
  const existing = await localGetDreamByRemoteId(remote.id);

  const jsonStr = (v: unknown) => v && typeof v === 'object' ? JSON.stringify(v) : undefined;

  if (!existing) {
    // New remote record, save locally
    await localSaveDream({
      remote_id: remote.id,
      content: remote.content,
      transcript: remote.transcript,
      capture_mode: remote.capture_mode,
      category: remote.category,
      themes: remote.themes,
      emotion: remote.emotion,
      symbols: remote.symbols,
      narrative: remote.narrative,
      nugget: remote.nugget,
      interpretation: jsonStr(remote.interpretation),
      lucidity_level: remote.lucidity_level,
      pre_sleep_intent: remote.pre_sleep_intent,
      pre_sleep_note: remote.pre_sleep_note,
      mood_valence: remote.mood_valence,
      context: jsonStr(remote.context),
      media_urls: jsonStr(remote.media_urls),
      generated_image_url: remote.generated_image_url,
      generated_image_prompt: remote.generated_image_prompt,
      generated_image_style: remote.generated_image_style,
      generated_image_source: remote.generated_image_source,
      sleep_session_id: remote.sleep_session_id,
      sleep_score: remote.sleep_score,
      sleep_duration_minutes: remote.sleep_duration_minutes,
      rem_minutes: remote.rem_minutes,
      visibility: remote.visibility,
      watermark: jsonStr(remote.watermark),
      asset_metadata: jsonStr(remote.asset_metadata),
      license: remote.license,
      allow_remix: remote.allow_remix,
      device_id: remote.device_id,
      is_sample: remote.is_sample,
      sync_status: 'synced',
      local_created_at: remote.created_at,
      local_updated_at: remote.updated_at,
      expires_at: remote.expires_at,
    });
  } else if (new Date(remote.updated_at) > new Date(existing.local_updated_at)) {
    // Remote is newer, update local
    await localUpdateDream(existing.id, {
      content: remote.content,
      transcript: remote.transcript,
      capture_mode: remote.capture_mode,
      category: remote.category,
      themes: remote.themes,
      emotion: remote.emotion,
      symbols: remote.symbols,
      narrative: remote.narrative,
      nugget: remote.nugget,
      interpretation: jsonStr(remote.interpretation),
      lucidity_level: remote.lucidity_level,
      pre_sleep_intent: remote.pre_sleep_intent,
      pre_sleep_note: remote.pre_sleep_note,
      mood_valence: remote.mood_valence,
      context: jsonStr(remote.context),
      media_urls: jsonStr(remote.media_urls),
      generated_image_url: remote.generated_image_url,
      generated_image_prompt: remote.generated_image_prompt,
      generated_image_style: remote.generated_image_style,
      generated_image_source: remote.generated_image_source,
      sleep_session_id: remote.sleep_session_id,
      sleep_score: remote.sleep_score,
      sleep_duration_minutes: remote.sleep_duration_minutes,
      rem_minutes: remote.rem_minutes,
      visibility: remote.visibility,
      watermark: jsonStr(remote.watermark),
      asset_metadata: jsonStr(remote.asset_metadata),
      license: remote.license,
      allow_remix: remote.allow_remix,
      sync_status: 'synced',
      local_updated_at: remote.updated_at,
      expires_at: remote.expires_at,
    });
  }
  // If local is newer, it will be pushed on next sync cycle
}

async function mergeRemoteSleepToLocal(remote: SleepSessionRecord): Promise<void> {
  const existing = await localGetSleepByRemoteId(remote.id);

  const jsonStr = (v: unknown) => v && typeof v === 'object' ? JSON.stringify(v) : undefined;

  if (!existing) {
    await localSaveSleepSession({
      remote_id: remote.id,
      sleep_start: remote.sleep_start,
      sleep_end: remote.sleep_end,
      time_in_bed_minutes: remote.time_in_bed_minutes,
      awake_minutes: remote.awake_minutes,
      light_minutes: remote.light_minutes,
      deep_minutes: remote.deep_minutes,
      rem_minutes: remote.rem_minutes,
      total_sleep_minutes: remote.total_sleep_minutes,
      sleep_efficiency: remote.sleep_efficiency,
      awakenings: remote.awakenings,
      waso_minutes: remote.waso_minutes,
      movement_index: remote.movement_index,
      heart_rate_avg: remote.heart_rate_avg,
      heart_rate_variability: remote.heart_rate_variability,
      algorithmic_score: remote.algorithmic_score,
      user_report_score: remote.user_report_score,
      calibration_offset: remote.calibration_offset,
      calibrated_score: remote.calibrated_score,
      circadian_alignment_score: remote.circadian_alignment_score,
      chronotype_estimate: remote.chronotype_estimate,
      source: remote.source,
      wearable_provider: remote.wearable_provider,
      device_id: remote.device_id,
      dream_id: remote.dream_id,
      morning_check_in: jsonStr(remote.morning_check_in),
      is_active: remote.is_active,
      sync_status: 'synced',
      local_created_at: remote.created_at,
      local_updated_at: remote.updated_at,
      expires_at: remote.expires_at,
    });
  } else if (new Date(remote.updated_at) > new Date(existing.local_updated_at)) {
    await localUpdateSleepSession(existing.id, {
      sleep_start: remote.sleep_start,
      sleep_end: remote.sleep_end,
      time_in_bed_minutes: remote.time_in_bed_minutes,
      awake_minutes: remote.awake_minutes,
      light_minutes: remote.light_minutes,
      deep_minutes: remote.deep_minutes,
      rem_minutes: remote.rem_minutes,
      total_sleep_minutes: remote.total_sleep_minutes,
      sleep_efficiency: remote.sleep_efficiency,
      awakenings: remote.awakenings,
      waso_minutes: remote.waso_minutes,
      movement_index: remote.movement_index,
      heart_rate_avg: remote.heart_rate_avg,
      heart_rate_variability: remote.heart_rate_variability,
      algorithmic_score: remote.algorithmic_score,
      user_report_score: remote.user_report_score,
      calibration_offset: remote.calibration_offset,
      calibrated_score: remote.calibrated_score,
      circadian_alignment_score: remote.circadian_alignment_score,
      chronotype_estimate: remote.chronotype_estimate,
      source: remote.source,
      wearable_provider: remote.wearable_provider,
      dream_id: remote.dream_id,
      morning_check_in: jsonStr(remote.morning_check_in),
      is_active: remote.is_active,
      sync_status: 'synced',
      local_updated_at: remote.updated_at,
      expires_at: remote.expires_at,
    });
  }
}

// ============================================================
// LOOKUP HELPERS
// ============================================================

async function localGetDreamByRemoteId(remoteId: string): Promise<LocalDream | undefined> {
  const all = await localGetAllDreams();
  return all.find(d => d.remote_id === remoteId);
}

async function localGetSleepByRemoteId(remoteId: string): Promise<LocalSleepSession | undefined> {
  const all = await localGetAllSleepSessions();
  return all.find(s => s.remote_id === remoteId);
}

// ============================================================
// MAPPERS: Local -> Remote
// ============================================================

function mapLocalDreamToRemote(local: LocalDream, userId: string): Partial<DreamRecord> {
  return {
    user_id: userId,
    content: local.content,
    transcript: local.transcript,
    capture_mode: local.capture_mode,
    category: local.category,
    themes: local.themes,
    emotion: local.emotion,
    symbols: local.symbols,
    narrative: local.narrative,
    nugget: local.nugget,
    interpretation: local.interpretation ? JSON.parse(local.interpretation) : {},
    lucidity_level: local.lucidity_level,
    pre_sleep_intent: local.pre_sleep_intent,
    pre_sleep_note: local.pre_sleep_note,
    mood_valence: local.mood_valence,
    context: local.context ? JSON.parse(local.context) : {},
    media_urls: local.media_urls ? JSON.parse(local.media_urls) : [],
    generated_image_url: local.generated_image_url,
    generated_image_prompt: local.generated_image_prompt,
    generated_image_style: local.generated_image_style,
    generated_image_source: local.generated_image_source,
    sleep_session_id: local.sleep_session_id,
    sleep_score: local.sleep_score,
    sleep_duration_minutes: local.sleep_duration_minutes,
    rem_minutes: local.rem_minutes,
    visibility: local.visibility,
    watermark: local.watermark ? JSON.parse(local.watermark) : {},
    asset_metadata: local.asset_metadata ? JSON.parse(local.asset_metadata) : {},
    license: local.license,
    allow_remix: local.allow_remix,
    device_id: local.device_id,
    is_sample: local.is_sample,
    local_created_at: local.local_created_at,
    local_updated_at: local.local_updated_at,
  };
}

function mapLocalSleepToRemote(local: LocalSleepSession, userId: string): Partial<SleepSessionRecord> {
  return {
    user_id: userId,
    sleep_start: local.sleep_start,
    sleep_end: local.sleep_end,
    time_in_bed_minutes: local.time_in_bed_minutes,
    awake_minutes: local.awake_minutes,
    light_minutes: local.light_minutes,
    deep_minutes: local.deep_minutes,
    rem_minutes: local.rem_minutes,
    total_sleep_minutes: local.total_sleep_minutes,
    sleep_efficiency: local.sleep_efficiency,
    awakenings: local.awakenings,
    waso_minutes: local.waso_minutes,
    movement_index: local.movement_index,
    heart_rate_avg: local.heart_rate_avg,
    heart_rate_variability: local.heart_rate_variability,
    algorithmic_score: local.algorithmic_score,
    user_report_score: local.user_report_score,
    calibration_offset: local.calibration_offset,
    calibrated_score: local.calibrated_score,
    circadian_alignment_score: local.circadian_alignment_score,
    chronotype_estimate: local.chronotype_estimate,
    source: local.source,
    wearable_provider: local.wearable_provider,
    device_id: local.device_id,
    dream_id: local.dream_id,
    morning_check_in: local.morning_check_in ? JSON.parse(local.morning_check_in) : {},
    is_active: local.is_active,
  };
}

// ============================================================
// FULL SYNC (bidirectional)
// ============================================================

export async function fullSync(): Promise<{
  pushed: number;
  pulled: number;
  errors: number;
}> {
  console.log('[Sync] Starting full bidirectional sync...');

  const pushResult = await syncToRemote();
  const pullResult = await syncFromRemote();

  console.log('[Sync] Full sync complete:', {
    pushed: pushResult.pushed,
    pulled: pullResult.pulled,
    errors: pushResult.errors + pullResult.errors,
  });

  return {
    pushed: pushResult.pushed,
    pulled: pullResult.pulled,
    errors: pushResult.errors + pullResult.errors,
  };
}
