/**
 * Dream CRUD Operations — Supabase Data Layer
 *
 * Provides typed CRUD functions for the `dreams` table.
 * All operations enforce user-scoping via RLS policies.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Your Supabase anon/public key
 *
 * @module supabase/dreams
 */

import { supabase } from './client';

// ── Types ────────────────────────────────────────────────────

export interface DreamRecord {
  id: string;
  user_id: string;
  content: string;
  transcript?: string;
  capture_mode: 'text' | 'audio' | 'video';
  category: string;
  themes: string[];
  emotion: string;
  symbols: string[];
  narrative?: string;
  nugget?: string;
  interpretation?: Record<string, unknown>;
  lucidity_level?: number;
  pre_sleep_intent?: string;
  pre_sleep_note?: string;
  mood_valence?: number;
  context?: Record<string, unknown>;
  media_urls?: Array<{ type: string; url: string }>;
  generated_image_url?: string;
  generated_image_prompt?: string;
  generated_image_style?: string;
  generated_image_source?: string;
  sleep_session_id?: string;
  sleep_score?: number;
  sleep_duration_minutes?: number;
  rem_minutes?: number;
  visibility: 'private' | 'trusted' | 'public';
  watermark?: Record<string, unknown>;
  asset_metadata?: Record<string, unknown>;
  license: string;
  allow_remix: boolean;
  device_id?: string;
  is_sample: boolean;
  is_deleted: boolean;
  local_created_at?: string;
  local_updated_at?: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export type DreamInsert = Partial<DreamRecord> & { user_id: string; content: string };
export type DreamUpdate = Partial<DreamRecord>;

// ── CRUD Operations ──────────────────────────────────────────

/**
 * Fetch all dreams for a user, ordered by most recent first.
 *
 * @param userId — The profile UUID of the user
 * @param limit — Maximum number of dreams to return (default: 100)
 * @returns Array of DreamRecord, or empty array on error
 *
 * @example
 * ```ts
 * const dreams = await getDreams(user.id);
 * console.log(`${dreams.length} dreams found`);
 * ```
 */
export async function getDreams(userId: string, limit = 100): Promise<DreamRecord[]> {
  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[dreams] getDreams error:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch a single dream by its ID.
 * RLS ensures the user can only access their own dreams.
 *
 * @param id — The dream UUID
 * @returns The DreamRecord, or null if not found
 *
 * @example
 * ```ts
 * const dream = await getDream(dreamId);
 * if (dream) console.log(dream.content);
 * ```
 */
export async function getDream(id: string): Promise<DreamRecord | null> {
  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (error) {
    console.error('[dreams] getDream error:', error);
    return null;
  }
  return data;
}

/**
 * Create a new dream record.
 *
 * @param userId — The profile UUID of the user
 * @param data — Dream data (must include content)
 * @returns The created DreamRecord, or null on error
 *
 * @example
 * ```ts
 * const dream = await createDream(user.id, {
 *   content: 'I was flying over the ocean...',
 *   category: 'adventure',
 *   emotion: 'joy',
 * });
 * ```
 */
export async function createDream(userId: string, data: DreamInsert): Promise<DreamRecord | null> {
  const { data: created, error } = await supabase
    .from('dreams')
    .insert({ ...data, user_id: userId })
    .select()
    .single();

  if (error) {
    console.error('[dreams] createDream error:', error);
    return null;
  }
  return created;
}

/**
 * Update an existing dream record.
 * Automatically updates the `updated_at` timestamp via trigger.
 *
 * @param id — The dream UUID to update
 * @param data — Partial dream data to update
 * @returns The updated DreamRecord, or null on error
 *
 * @example
 * ```ts
 * const updated = await updateDream(dreamId, {
 *   content: 'Updated dream text...',
 *   category: 'lucid',
 * });
 * ```
 */
export async function updateDream(id: string, data: DreamUpdate): Promise<DreamRecord | null> {
  const { data: updated, error } = await supabase
    .from('dreams')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[dreams] updateDream error:', error);
    return null;
  }
  return updated;
}

/**
 * Soft-delete a dream by setting `is_deleted = true`.
 * The record will be permanently removed after 7 days by the cleanup cron.
 *
 * @param id — The dream UUID to soft-delete
 * @returns true if successful, false on error
 *
 * @example
 * ```ts
 * const success = await deleteDream(dreamId);
 * if (success) console.log('Dream deleted');
 * ```
 */
export async function deleteDream(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('dreams')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[dreams] deleteDream error:', error);
    return false;
  }
  return true;
}

/**
 * Permanently delete a dream record. Use with caution.
 * Prefer `deleteDream()` (soft-delete) in most cases.
 *
 * @param id — The dream UUID to permanently delete
 * @returns true if successful, false on error
 */
export async function permanentlyDeleteDream(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('dreams')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[dreams] permanentlyDeleteDream error:', error);
    return false;
  }
  return true;
}

/**
 * Search dreams by content text (case-insensitive).
 *
 * @param userId — The profile UUID of the user
 * @param query — Search string to match against dream content
 * @param limit — Maximum results (default: 20)
 * @returns Array of matching DreamRecords
 */
export async function searchDreams(userId: string, query: string, limit = 20): Promise<DreamRecord[]> {
  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[dreams] searchDreams error:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch dreams filtered by category.
 *
 * @param userId — The profile UUID of the user
 * @param category — Category to filter by (e.g., 'lucid', 'nightmare')
 * @param limit — Maximum results (default: 50)
 * @returns Array of matching DreamRecords
 */
export async function getDreamsByCategory(userId: string, category: string, limit = 50): Promise<DreamRecord[]> {
  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[dreams] getDreamsByCategory error:', error);
    return [];
  }
  return data || [];
}

/**
 * Count total dreams for a user.
 *
 * @param userId — The profile UUID of the user
 * @returns The count, or 0 on error
 */
export async function countDreams(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('dreams')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_deleted', false);

  if (error) {
    console.error('[dreams] countDreams error:', error);
    return 0;
  }
  return count || 0;
}
