/**
 * IndexedDB Local-First Storage Layer
 *
 * Provides structured, indexed, queryable local storage with:
 * - 35-day TTL auto-cleanup
 * - Indexes for fast queries (date, category, themes, visibility)
 * - Sync queue for pending changes
 * - Replaces the fragile localStorage approach
 *
 * DB Name: everdream_local
 * Version: 1
 */

const DB_NAME = 'everdream_local';
const DB_VERSION = 1;
const RETENTION_DAYS = 35;

// ============================================================
// TYPES
// ============================================================

export interface LocalDream {
  id: string;
  content: string;
  transcript?: string;
  capture_mode: 'text' | 'audio' | 'video';
  category: string;
  themes: string[];
  emotion: string;
  symbols: string[];
  narrative?: string;
  nugget?: string;
  interpretation?: string;  // JSON string
  lucidity_level?: number;
  pre_sleep_intent?: string;
  pre_sleep_note?: string;
  mood_valence?: number;
  context?: string;  // JSON string
  media_urls?: string;  // JSON string
  generated_image_url?: string;
  generated_image_prompt?: string;
  generated_image_style?: string;
  generated_image_source?: string;
  sleep_session_id?: string;
  sleep_score?: number;
  sleep_duration_minutes?: number;
  rem_minutes?: number;
  visibility: 'private' | 'trusted' | 'public';
  watermark?: string;  // JSON string
  asset_metadata?: string;  // JSON string
  license: string;
  allow_remix: boolean;
  device_id?: string;
  is_sample: boolean;

  // Sync state
  sync_status: 'synced' | 'pending' | 'conflict';
  remote_id?: string;  // Supabase UUID once synced

  // Timestamps
  local_created_at: string;
  local_updated_at: string;
  expires_at: string;
}

export interface LocalSleepSession {
  id: string;
  sleep_start: string;
  sleep_end?: string;
  time_in_bed_minutes?: number;
  awake_minutes: number;
  light_minutes: number;
  deep_minutes: number;
  rem_minutes: number;
  total_sleep_minutes: number;
  sleep_efficiency?: number;
  awakenings: number;
  waso_minutes: number;
  movement_index?: number;
  heart_rate_avg?: number;
  heart_rate_variability?: number;
  algorithmic_score?: number;
  user_report_score?: number;
  calibration_offset: number;
  calibrated_score?: number;
  circadian_alignment_score?: number;
  chronotype_estimate?: string;
  source: string;
  wearable_provider?: string;
  device_id?: string;
  dream_id?: string;
  morning_check_in?: string;  // JSON string
  is_active: boolean;

  // Sync state
  sync_status: 'synced' | 'pending' | 'conflict';
  remote_id?: string;

  // Timestamps
  local_created_at: string;
  local_updated_at: string;
  expires_at: string;
}

export interface LocalSyncQueueItem {
  id?: number;
  table_name: 'dreams' | 'sleep_sessions' | 'user_settings';
  record_id: string;
  operation: 'insert' | 'update' | 'delete';
  payload: string;  // JSON string
  created_at: string;
  attempts: number;
  last_error?: string;
}

export interface LocalSettings {
  key: string;
  value: string;  // JSON string
  updated_at: string;
}

// ============================================================
// DB INITIALIZATION
// ============================================================

let dbInstance: IDBDatabase | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Dreams store
      if (!db.objectStoreNames.contains('dreams')) {
        const dreamStore = db.createObjectStore('dreams', { keyPath: 'id' });
        dreamStore.createIndex('by_date', 'local_created_at', { unique: false });
        dreamStore.createIndex('by_expires', 'expires_at', { unique: false });
        dreamStore.createIndex('by_sync', 'sync_status', { unique: false });
        dreamStore.createIndex('by_category', 'category', { unique: false });
        dreamStore.createIndex('by_visibility', 'visibility', { unique: false });
        dreamStore.createIndex('by_remote_id', 'remote_id', { unique: true });
      }

      // Sleep sessions store
      if (!db.objectStoreNames.contains('sleep_sessions')) {
        const sleepStore = db.createObjectStore('sleep_sessions', { keyPath: 'id' });
        sleepStore.createIndex('by_date', 'sleep_start', { unique: false });
        sleepStore.createIndex('by_expires', 'expires_at', { unique: false });
        sleepStore.createIndex('by_sync', 'sync_status', { unique: false });
        sleepStore.createIndex('by_active', 'is_active', { unique: false });
        sleepStore.createIndex('by_remote_id', 'remote_id', { unique: true });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('by_table_record', ['table_name', 'record_id'], { unique: false });
        syncStore.createIndex('by_created', 'created_at', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };
  });
}

// ============================================================
// GENERIC CRUD HELPERS
// ============================================================

function putRecord<T>(storeName: string, record: T): Promise<T> {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(record);
      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  });
}

function getRecord<T>(storeName: string, key: string): Promise<T | undefined> {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

function getAllRecords<T>(storeName: string, indexName?: string, query?: IDBValid | IDBKeyRange | null): Promise<T[]> {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const source = indexName ? store.index(indexName) : store;
      const request = query !== undefined ? source.getAll(query) : source.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  });
}

function deleteRecord(storeName: string, key: IDBValid): Promise<void> {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function countRecords(storeName: string): Promise<number> {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

// ============================================================
// DREAM OPERATIONS
// ============================================================

export async function localSaveDream(dream: Partial<LocalDream>): Promise<LocalDream> {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const record: LocalDream = {
    id: dream.id || crypto.randomUUID(),
    content: dream.content || '',
    transcript: dream.transcript,
    capture_mode: dream.capture_mode || 'text',
    category: dream.category || 'uncategorized',
    themes: dream.themes || [],
    emotion: dream.emotion || 'neutral',
    symbols: dream.symbols || [],
    narrative: dream.narrative,
    nugget: dream.nugget,
    interpretation: dream.interpretation ? JSON.stringify(dream.interpretation) : undefined,
    lucidity_level: dream.lucidity_level,
    pre_sleep_intent: dream.pre_sleep_intent,
    pre_sleep_note: dream.pre_sleep_note,
    mood_valence: dream.mood_valence,
    context: dream.context ? JSON.stringify(dream.context) : undefined,
    media_urls: dream.media_urls ? JSON.stringify(dream.media_urls) : undefined,
    generated_image_url: dream.generated_image_url,
    generated_image_prompt: dream.generated_image_prompt,
    generated_image_style: dream.generated_image_style,
    generated_image_source: dream.generated_image_source,
    sleep_session_id: dream.sleep_session_id,
    sleep_score: dream.sleep_score,
    sleep_duration_minutes: dream.sleep_duration_minutes,
    rem_minutes: dream.rem_minutes,
    visibility: dream.visibility || 'private',
    watermark: dream.watermark ? JSON.stringify(dream.watermark) : undefined,
    asset_metadata: dream.asset_metadata ? JSON.stringify(dream.asset_metadata) : undefined,
    license: dream.license || 'copyleft',
    allow_remix: dream.allow_remix !== false,
    device_id: dream.device_id,
    is_sample: dream.is_sample || false,
    sync_status: dream.sync_status || 'pending',
    remote_id: dream.remote_id,
    local_created_at: dream.local_created_at || now,
    local_updated_at: now,
    expires_at: dream.expires_at || expiresAt,
  };

  await putRecord('dreams', record);

  // Add to sync queue
  await addToSyncQueue({
    table_name: 'dreams',
    record_id: record.id,
    operation: dream.remote_id ? 'update' : 'insert',
    payload: JSON.stringify(record),
    created_at: now,
    attempts: 0,
  });

  return record;
}

export async function localGetDream(id: string): Promise<LocalDream | undefined> {
  return getRecord<LocalDream>('dreams', id);
}

export async function localGetAllDreams(): Promise<LocalDream[]> {
  const dreams = await getAllRecords<LocalDream>('dreams', 'by_date');
  return dreams.sort((a, b) => b.local_created_at.localeCompare(a.local_created_at));
}

export async function localGetDreamsByCategory(category: string): Promise<LocalDream[]> {
  return getAllRecords<LocalDream>('dreams', 'by_category', category);
}

export async function localGetDreamsByVisibility(visibility: string): Promise<LocalDream[]> {
  return getAllRecords<LocalDream>('dreams', 'by_visibility', visibility);
}

export async function localGetPendingDreams(): Promise<LocalDream[]> {
  return getAllRecords<LocalDream>('dreams', 'by_sync', 'pending');
}

export async function localUpdateDream(id: string, updates: Partial<LocalDream>): Promise<LocalDream | null> {
  const existing = await localGetDream(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: LocalDream = {
    ...existing,
    ...updates,
    id,  // Prevent ID overwrite
    local_updated_at: now,
    sync_status: 'pending',
  };

  await putRecord('dreams', updated);

  await addToSyncQueue({
    table_name: 'dreams',
    record_id: id,
    operation: 'update',
    payload: JSON.stringify(updated),
    created_at: now,
    attempts: 0,
  });

  return updated;
}

export async function localDeleteDream(id: string): Promise<void> {
  await addToSyncQueue({
    table_name: 'dreams',
    record_id: id,
    operation: 'delete',
    payload: JSON.stringify({ id }),
    created_at: new Date().toISOString(),
    attempts: 0,
  });

  await deleteRecord('dreams', id);
}

// ============================================================
-- SLEEP SESSION OPERATIONS
// ============================================================

export async function localSaveSleepSession(session: Partial<LocalSleepSession>): Promise<LocalSleepSession> {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const record: LocalSleepSession = {
    id: session.id || crypto.randomUUID(),
    sleep_start: session.sleep_start || now,
    sleep_end: session.sleep_end,
    time_in_bed_minutes: session.time_in_bed_minutes,
    awake_minutes: session.awake_minutes || 0,
    light_minutes: session.light_minutes || 0,
    deep_minutes: session.deep_minutes || 0,
    rem_minutes: session.rem_minutes || 0,
    total_sleep_minutes: session.total_sleep_minutes || 0,
    sleep_efficiency: session.sleep_efficiency,
    awakenings: session.awakenings || 0,
    waso_minutes: session.waso_minutes || 0,
    movement_index: session.movement_index,
    heart_rate_avg: session.heart_rate_avg,
    heart_rate_variability: session.heart_rate_variability,
    algorithmic_score: session.algorithmic_score,
    user_report_score: session.user_report_score,
    calibration_offset: session.calibration_offset || 0,
    calibrated_score: session.calibrated_score,
    circadian_alignment_score: session.circadian_alignment_score,
    chronotype_estimate: session.chronotype_estimate,
    source: session.source || 'manual',
    wearable_provider: session.wearable_provider,
    device_id: session.device_id,
    dream_id: session.dream_id,
    morning_check_in: session.morning_check_in ? JSON.stringify(session.morning_check_in) : undefined,
    is_active: session.is_active || false,
    sync_status: session.sync_status || 'pending',
    remote_id: session.remote_id,
    local_created_at: session.local_created_at || now,
    local_updated_at: now,
    expires_at: session.expires_at || expiresAt,
  };

  await putRecord('sleep_sessions', record);

  await addToSyncQueue({
    table_name: 'sleep_sessions',
    record_id: record.id,
    operation: session.remote_id ? 'update' : 'insert',
    payload: JSON.stringify(record),
    created_at: now,
    attempts: 0,
  });

  return record;
}

export async function localGetSleepSession(id: string): Promise<LocalSleepSession | undefined> {
  return getRecord<LocalSleepSession>('sleep_sessions', id);
}

export async function localGetAllSleepSessions(): Promise<LocalSleepSession[]> {
  const sessions = await getAllRecords<LocalSleepSession>('sleep_sessions', 'by_date');
  return sessions.sort((a, b) => b.sleep_start.localeCompare(a.sleep_start));
}

export async function localGetActiveSleepSession(): Promise<LocalSleepSession | undefined> {
  const sessions = await getAllRecords<LocalSleepSession>('sleep_sessions', 'by_active', 1);
  return sessions[0];
}

export async function localUpdateSleepSession(id: string, updates: Partial<LocalSleepSession>): Promise<LocalSleepSession | null> {
  const existing = await localGetSleepSession(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: LocalSleepSession = {
    ...existing,
    ...updates,
    id,
    local_updated_at: now,
    sync_status: 'pending',
  };

  await putRecord('sleep_sessions', updated);

  await addToSyncQueue({
    table_name: 'sleep_sessions',
    record_id: id,
    operation: 'update',
    payload: JSON.stringify(updated),
    created_at: now,
    attempts: 0,
  });

  return updated;
}

// ============================================================
// SYNC QUEUE
// ============================================================

export async function addToSyncQueue(item: Omit<LocalSyncQueueItem, 'id'>): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const request = store.add(item as LocalSyncQueueItem);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSyncQueue(): Promise<LocalSyncQueueItem[]> {
  return getAllRecords<LocalSyncQueueItem>('sync_queue', 'by_created');
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const request = store.delete(id as IDBValid);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================
// SETTINGS
// ============================================================

export async function localSetSetting(key: string, value: unknown): Promise<void> {
  const record: LocalSettings = {
    key,
    value: JSON.stringify(value),
    updated_at: new Date().toISOString(),
  };
  await putRecord('settings', record);
}

export async function localGetSetting<T = unknown>(key: string): Promise<T | null> {
  const record = await getRecord<LocalSettings>('settings', key);
  if (!record) return null;
  try {
    return JSON.parse(record.value) as T;
  } catch {
    return record.value as unknown as T;
  }
}

// ============================================================
-- 35-DAY RETENTION CLEANUP
// ============================================================

export async function cleanupExpiredRecords(): Promise<{ dreams: number; sleepSessions: number }> {
  const db = await getDB();
  const now = new Date().toISOString();
  let dreamsDeleted = 0;
  let sessionsDeleted = 0;

  // Delete expired dreams
  const expiredDreams = await getAllRecords<LocalDream>('dreams', 'by_expires', IDBKeyRange.upperBound(now));
  for (const dream of expiredDreams) {
    await deleteRecord('dreams', dream.id);
    dreamsDeleted++;
  }

  // Delete expired sleep sessions
  const expiredSessions = await getAllRecords<LocalSleepSession>('sleep_sessions', 'by_expires', IDBKeyRange.upperBound(now));
  for (const session of expiredSessions) {
    await deleteRecord('sleep_sessions', session.id);
    sessionsDeleted++;
  }

  console.log(`[Storage] Cleaned up ${dreamsDeleted} dreams and ${sessionsDeleted} sleep sessions older than ${RETENTION_DAYS} days`);
  return { dreams: dreamsDeleted, sleepSessions: sessionsDeleted };
}

// ============================================================
-- STORAGE STATS
// ============================================================

export async function getStorageStats(): Promise<{
  dreams: number;
  sleepSessions: number;
  syncQueue: number;
  settings: number;
}> {
  const [dreams, sleepSessions, syncQueue, settings] = await Promise.all([
    countRecords('dreams'),
    countRecords('sleep_sessions'),
    countRecords('sync_queue'),
    countRecords('settings'),
  ]);

  return { dreams, sleepSessions, syncQueue, settings };
}

// ============================================================
-- MIGRATION: localStorage -> IndexedDB (one-time)
// ============================================================

export async function migrateFromLocalStorage(): Promise<{ migrated: number; errors: number }> {
  let migrated = 0;
  let errors = 0;

  try {
    // Migrate dreams
    const dreamsJson = localStorage.getItem('ed.dreams');
    if (dreamsJson) {
      const dreams = JSON.parse(dreamsJson);
      if (Array.isArray(dreams)) {
        for (const dream of dreams) {
          try {
            await localSaveDream({
              ...dream,
              local_created_at: dream.date || new Date().toISOString(),
              local_updated_at: new Date().toISOString(),
            });
            migrated++;
          } catch {
            errors++;
          }
        }
      }
    }

    // Migrate settings
    const settingsJson = localStorage.getItem('ed.settings');
    if (settingsJson) {
      await localSetSetting('app_settings', JSON.parse(settingsJson));
      migrated++;
    }

    // Migrate wearable data
    const wearableJson = localStorage.getItem('ed.wearableData');
    if (wearableJson) {
      await localSetSetting('wearable_data', JSON.parse(wearableJson));
      migrated++;
    }

    // Migrate achievements
    const achievementsJson = localStorage.getItem('ed.achievements');
    if (achievementsJson) {
      await localSetSetting('achievements', JSON.parse(achievementsJson));
      migrated++;
    }

    // Migrate privacy settings
    const privacyJson = localStorage.getItem('ed.privacySettings');
    if (privacyJson) {
      await localSetSetting('privacy_settings', JSON.parse(privacyJson));
      migrated++;
    }

    // Migrate terms accepted
    const termsJson = localStorage.getItem('ed.termsAccepted');
    if (termsJson) {
      await localSetSetting('terms_accepted', JSON.parse(termsJson));
      migrated++;
    }

    console.log(`[Storage] Migration complete: ${migrated} items migrated, ${errors} errors`);
  } catch (err) {
    console.error('[Storage] Migration error:', err);
    errors++;
  }

  return { migrated, errors };
}
