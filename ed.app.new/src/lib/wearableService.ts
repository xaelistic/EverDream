/**
 * Wearable Service
 * 
 * Helpers for managing wearable connections and syncing data to Supabase.
 * Use with the wearables.ts library.
 */

import { supabase } from './supabase/client';
import type { WearableProvider, WearableAuth, WearableSleepRecord } from './wearables';
import { fetchAllWearableSleep } from './wearables';

export interface WearableConnection {
  id: string;
  user_id: string;
  provider: WearableProvider;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  scopes?: string[];
}

export async function saveWearableConnection(
  profileId: string,
  provider: WearableProvider,
  auth: WearableAuth
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('wearable_connections')
      .upsert({
        user_id: profileId,
        provider,
        access_token: auth.accessToken,
        refresh_token: auth.refreshToken,
        expires_at: auth.expiresAt ? new Date(auth.expiresAt).toISOString() : null,
        scopes: [], // populate if needed
      }, { onConflict: 'user_id,provider' });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Failed to save wearable connection:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getWearableConnections(profileId: string): Promise<WearableConnection[]> {
  const { data, error } = await supabase
    .from('wearable_connections')
    .select('*')
    .eq('user_id', profileId);

  if (error) {
    console.error('Failed to load wearable connections:', error);
    return [];
  }
  return data || [];
}

export async function deleteWearableConnection(profileId: string, provider: WearableProvider) {
  await supabase
    .from('wearable_connections')
    .delete()
    .eq('user_id', profileId)
    .eq('provider', provider);
}

/**
 * Map normalized wearable record to sleep_sessions insert payload.
 */
export function mapWearableRecordToSleepSession(
  record: WearableSleepRecord,
  userProfileId: string,
  provider: WearableProvider
) {
  const sleepStart = record.bedtime;
  const sleepEnd = record.wakeTime;

  return {
    user_id: userProfileId,
    sleep_start: sleepStart,
    sleep_end: sleepEnd,
    time_in_bed_minutes: record.durationMinutes,
    awake_minutes: record.awakeMinutes,
    light_minutes: record.lightMinutes,
    deep_minutes: record.deepMinutes,
    rem_minutes: record.remMinutes,
    total_sleep_minutes: record.durationMinutes - record.awakeMinutes,
    sleep_efficiency: record.efficiency,
    awakenings: 0, // often not directly available
    waso_minutes: Math.round(record.awakeMinutes * 0.6), // estimate
    movement_index: undefined,
    heart_rate_avg: record.heartRateAvg,
    heart_rate_variability: record.hrv,
    algorithmic_score: record.score,
    user_report_score: undefined,
    calibration_offset: 0,
    calibrated_score: record.score,
    circadian_alignment_score: undefined,
    chronotype_estimate: undefined,
    source: 'wearable' as const,
    wearable_provider: provider,
    device_id: undefined,
    dream_id: undefined, // link later via date or UI
    morning_check_in: undefined,
    is_active: false,
  };
}

/**
 * Sync wearable data for a user and persist to DB.
 * Returns the records fetched.
 */
export async function syncAndPersistWearableData(
  profileId: string,
  configs: Array<{ provider: WearableProvider; auth: WearableAuth; enabled: boolean }>,
  days = 30
): Promise<WearableSleepRecord[]> {
  const enabled = configs.filter(c => c.enabled && c.auth.accessToken);
  if (enabled.length === 0) return [];

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const allRecords = await fetchAllWearableSleep(
    enabled.map(c => c.auth),
    startDate,
    endDate
  );

  if (allRecords.length === 0) return allRecords;

  // Map and upsert
  const payloads = allRecords.map(record => {
    // Find which provider this record came from (simple heuristic or enhance record)
    const provider = enabled[0]?.provider || 'oura'; // TODO: enhance to track per record
    return mapWearableRecordToSleepSession(record, profileId, provider);
  });

  const { error } = await supabase
    .from('sleep_sessions')
    .upsert(payloads, { 
      onConflict: 'user_id,sleep_start,wearable_provider',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error('Failed to persist wearable sleep data:', error);
    throw error;
  }

  // Optionally update user_settings
  await supabase
    .from('user_settings')
    .upsert({ user_id: profileId, wearable_sync: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  return allRecords;
}
