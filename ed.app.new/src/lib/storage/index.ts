/**
 * Unified Storage API
 *
 * Single entry point for all data operations.
 * Wraps IndexedDB (local) + Supabase (remote) + sync + webhooks.
 *
 * Usage:
 *   import { storage } from './storage';
 *
 *   // Save a dream (local-first, auto-syncs)
 *   await storage.dreams.save({ content: "I was flying..." });
 *
 *   // Get all dreams
 *   const dreams = await storage.dreams.getAll();
 *
 *   // Get storage stats
 *   const stats = await storage.stats();
 */

import {
  localSaveDream,
  localGetDream,
  localGetAllDreams,
  localUpdateDream,
  localDeleteDream,
  localGetDreamsByCategory,
  localGetDreamsByVisibility,
  localSaveSleepSession,
  localGetSleepSession,
  localGetAllSleepSessions,
  localUpdateSleepSession,
  localGetActiveSleepSession,
  localSetSetting,
  localGetSetting,
  cleanupExpiredRecords,
  getStorageStats,
  migrateFromLocalStorage,
  type LocalDream,
  type LocalSleepSession,
} from './indexedDB';
import {
  startAutoSync,
  stopAutoSync,
  fullSync,
  syncToRemote,
  syncFromRemote,
} from './sync';
import {
  notifyDreamCreated,
  notifyDreamAnalyzed,
  notifySleepSessionCompleted,
  notifyMorningCheckIn,
} from '../api/webhooks';
import { analyzeDreamWithAI } from '../api/ai-provider';

// ============================================================
// DREAM API
// ============================================================

const dreams = {
  /** Save a new dream (local-first, triggers sync + webhook) */
  async save(data: Partial<LocalDream>): Promise<LocalDream> {
    const dream = await localSaveDream(data);

    // Fire webhook (non-blocking)
    notifyDreamCreated(dream as unknown as Record<string, unknown>).catch(() => {});

    return dream;
  },

  /** Get a single dream by ID */
  async get(id: string): Promise<LocalDream | undefined> {
    return localGetDream(id);
  },

  /** Get all dreams, newest first */
  async getAll(): Promise<LocalDream[]> {
    return localGetAllDreams();
  },

  /** Get dreams by category */
  async getByCategory(category: string): Promise<LocalDream[]> {
    return localGetDreamsByCategory(category);
  },

  /** Get dreams by visibility */
  async getByVisibility(visibility: string): Promise<LocalDream[]> {
    return localGetDreamsByVisibility(visibility);
  },

  /** Update a dream */
  async update(id: string, data: Partial<LocalDream>): Promise<LocalDream | null> {
    return localUpdateDream(id, data);
  },

  /** Delete a dream */
  async delete(id: string): Promise<void> {
    return localDeleteDream(id);
  },

  /** Analyze a dream with AI and save the result */
  async analyze(id: string): Promise<LocalDream | null> {
    const dream = await localGetDream(id);
    if (!dream) return null;

    const analysis = await analyzeDreamWithAI(dream.content);
    const updated = await localUpdateDream(id, {
      category: analysis.category,
      themes: analysis.themes,
      emotion: analysis.emotion,
      symbols: analysis.symbols,
      narrative: analysis.narrative,
      nugget: analysis.nugget,
      interpretation: JSON.stringify(analysis.interpretation),
    });

    if (updated) {
      notifyDreamAnalyzed(updated as unknown as Record<string, unknown>).catch(() => {});
    }

    return updated;
  },

  /** Analyze raw text (for new dreams before saving) */
  async analyzeText(text: string): Promise<ReturnType<typeof analyzeDreamWithAI>> {
    return analyzeDreamWithAI(text);
  },
};

// ============================================================
// SLEEP SESSION API
// ============================================================

const sleep = {
  /** Save a new sleep session */
  async save(data: Partial<LocalSleepSession>): Promise<LocalSleepSession> {
    return localSaveSleepSession(data);
  },

  /** Get a single session by ID */
  async get(id: string): Promise<LocalSleepSession | undefined> {
    return localGetSleepSession(id);
  },

  /** Get all sessions, newest first */
  async getAll(): Promise<LocalSleepSession[]> {
    return localGetAllSleepSessions();
  },

  /** Get the currently active session (if any) */
  async getActive(): Promise<LocalSleepSession | undefined> {
    return localGetActiveSleepSession();
  },

  /** Update a session */
  async update(id: string, data: Partial<LocalSleepSession>): Promise<LocalSleepSession | null> {
    const updated = await localUpdateSleepSession(id, data);

    // If session just completed, fire webhook
    if (updated) {
      notifySleepSessionCompleted(updated as unknown as Record<string, unknown>).catch(() => {});
    }

    return updated;
  },

  /** Complete a sleep session with morning check-in */
  async complete(
    id: string,
    checkIn: { restednessScore: number; comment?: string }
  ): Promise<LocalSleepSession | null> {
    const now = new Date().toISOString();
    const updated = await localUpdateSleepSession(id, {
      sleep_end: now,
      is_active: false,
      user_report_score: checkIn.restednessScore,
      morning_check_in: JSON.stringify(checkIn),
    });

    if (updated) {
      notifySleepSessionCompleted(updated as unknown as Record<string, unknown>).catch(() => {});
      notifyMorningCheckIn(updated as unknown as Record<string, unknown>, checkIn).catch(() => {});
    }

    return updated;
  },
};

// ============================================================
// SETTINGS API
// ============================================================

const settings = {
  async set(key: string, value: unknown): Promise<void> {
    return localSetSetting(key, value);
  },

  async get<T = unknown>(key: string): Promise<T | null> {
    return localGetSetting<T>(key);
  },
};

// ============================================================
// SYNC API
// ============================================================

const sync = {
  /** Start automatic background sync */
  startAuto: startAutoSync,

  /** Stop automatic background sync */
  stopAuto: stopAutoSync,

  /** Run a full bidirectional sync now */
  full: fullSync,

  /** Push local changes to Supabase */
  push: syncToRemote,

  /** Pull remote changes from Supabase */
  pull: syncFromRemote,
};

// ============================================================
// MAINTENANCE API
// ============================================================

const maintenance = {
  /** Clean up expired records (35-day TTL) */
  cleanup: cleanupExpiredRecords,

  /** Get storage statistics */
  stats: getStorageStats,

  /** Migrate from old localStorage to IndexedDB */
  migrate: migrateFromLocalStorage,
};

// ============================================================
// EXPORT
// ============================================================

export const storage = {
  dreams,
  sleep,
  settings,
  sync,
  maintenance,
};

export default storage;
