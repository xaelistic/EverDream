/**
 * Dream Service — Unified local + Supabase persistence layer.
 *
 * Provides a single API for saving/loading dreams that:
 * 1. Always saves to local storage (instant, works offline)
 * 2. Syncs to Supabase when available (persists across devices)
 * 3. Loads from local first (fast), then merges from Supabase
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Supabase anon/public key
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────

export interface DreamData {
  id: string;
  content: string;
  title?: string;
  mood?: string;
  category: string;
  themes: string[];
  emotion: string;
  symbols: string[];
  narrative?: string;
  nugget?: string;
  interpretation?: {
    symbols: Record<string, string>;
    meaning: string;
    commonPattern: string;
  };
  imageUrl?: string;
  imagePrompt?: string;
  imageStyle?: string;
  imageSource?: string;
  captureMode: 'text' | 'audio' | 'video';
  context?: Record<string, unknown>;
  sleepData?: Record<string, unknown>;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DreamServiceError {
  code: 'SUPABASE_CONFIG' | 'AUTH_FAILED' | 'SAVE_FAILED' | 'SYNC_FAILED' | 'DELETE_FAILED';
  message: string;
  recoverable: boolean;
}

// ── Error Handling ────────────────────────────────────────────

let _onError: ((error: DreamServiceError) => void) | null = null;

/**
 * Set error handler for dream service errors
 */
export function setDreamServiceErrorHandler(handler: (error: DreamServiceError) => void): void {
  _onError = handler;
}

function reportError(error: DreamServiceError): void {
  console.warn('[DreamService]', error.code, error.message);
  if (_onError) {
    _onError(error);
  }
}

// ── Supabase Client ──────────────────────────────────────────

let _supabase: SupabaseClient | null = null;
let _user: User | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  _supabase = createClient(url, key, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  });
  return _supabase;
}

// ── Local Storage Helpers ────────────────────────────────────

const LOCAL_KEY = 'everdream_dreams';

function loadLocal(): DreamData[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocal(dreams: DreamData[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(dreams));
  } catch (e) {
    console.warn('[DreamService] Local storage full:', e);
  }
}

// ── Profile Helpers ──────────────────────────────────────────

async function getProfileId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Create profile
    const { data: created } = await supabase
      .from('profiles')
      .insert({ auth_user_id: userId })
      .select('id')
      .single();
    return created?.id ?? null;
  }

  return data?.id ?? null;
}

// ── Dream Data ↔ DB Record Conversion ───────────────────────

function dreamToRecord(dream: DreamData, userId: string) {
  return {
    id: dream.id,
    user_id: userId,
    content: dream.content,
    category: dream.category || 'normal',
    themes: dream.themes || [],
    emotion: dream.emotion || 'neutral',
    symbols: dream.symbols || [],
    narrative: dream.narrative || null,
    nugget: dream.nugget || null,
    interpretation: dream.interpretation || null,
    generated_image_url: dream.imageUrl || null,
    generated_image_prompt: dream.imagePrompt || null,
    generated_image_style: dream.imageStyle || 'dreamlike',
    generated_image_source: dream.imageSource || null,
    capture_mode: dream.captureMode || 'text',
    context: dream.context || null,
    is_sample: dream.isSample || false,
    local_created_at: dream.createdAt,
    local_updated_at: dream.updatedAt,
  };
}

function recordToDream(record: Record<string, unknown>): DreamData {
  return {
    id: record.id as string,
    content: record.content as string,
    title: (record.nugget as string) || undefined,
    category: (record.category as string) || 'normal',
    themes: (record.themes as string[]) || [],
    emotion: (record.emotion as string) || 'neutral',
    symbols: (record.symbols as string[]) || [],
    narrative: (record.narrative as string) || undefined,
    nugget: (record.nugget as string) || undefined,
    interpretation: (record.interpretation as DreamData['interpretation']) || undefined,
    imageUrl: (record.generated_image_url as string) || undefined,
    imagePrompt: (record.generated_image_prompt as string) || undefined,
    imageStyle: (record.generated_image_style as string) || undefined,
    imageSource: (record.generated_image_source as string) || undefined,
    captureMode: (record.capture_mode as DreamData['captureMode']) || 'text',
    context: (record.context as Record<string, unknown>) || undefined,
    isSample: (record.is_sample as boolean) || false,
    createdAt: (record.local_created_at as string) || (record.created_at as string) || new Date().toISOString(),
    updatedAt: (record.local_updated_at as string) || (record.updated_at as string) || new Date().toISOString(),
  };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Initialize the dream service.
 * Call this once at app startup.
 * Returns true if Supabase is available.
 */
export async function initDreamService(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    console.log('[DreamService] Supabase not configured — using local storage only');
    reportError({
      code: 'SUPABASE_CONFIG',
      message: 'Supabase not configured - using local storage only',
      recoverable: true,
    });
    return false;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    _user = user;
    if (user) {
      console.log('[DreamService] User authenticated:', user.id);
      // Trigger background sync with proper error handling
      await syncFromSupabase();
    }
    return true;
  } catch (err) {
    reportError({
      code: 'AUTH_FAILED',
      message: err instanceof Error ? err.message : 'Authentication failed',
      recoverable: true,
    });
    return false;
  }
}

/**
 * Sign in anonymously (no email/password needed).
 */
export async function signInAnonymously(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) return { success: false, error: error.message };
    _user = data.user;
    if (data.user) {
      await syncFromSupabase();
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Sign-in failed' };
  }
}

/**
 * Get the current user, if any.
 */
export function getCurrentUser(): User | null {
  return _user;
}

/**
 * Load all dreams (local first, merged with Supabase).
 */
export function loadDreams(): DreamData[] {
  return loadLocal();
}

/**
 * Save a dream (local + Supabase if available).
 */
export async function saveDream(dream: DreamData): Promise<{ success: boolean; error?: string }> {
  // Always save locally first
  const local = loadLocal();
  const existing = local.findIndex(d => d.id === dream.id);
  if (existing >= 0) {
    local[existing] = { ...dream, updatedAt: new Date().toISOString() };
  } else {
    local.unshift(dream);
  }
  saveLocal(local);

  // Sync to Supabase if available with retry logic
  const supabase = getSupabase();
  if (supabase && _user) {
    try {
      const profileId = await getProfileId(supabase, _user.id);
      if (!profileId) {
        reportError({
          code: 'SAVE_FAILED',
          message: 'Profile ID lookup failed - dream saved locally only',
          recoverable: true,
        });
        return { success: true, error: 'Saved locally only - profile not found' };
      }
      
      const record = dreamToRecord(dream, profileId);
      
      // Retry with exponential backoff
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { error } = await supabase.from('dreams').upsert(record);
          if (error) throw error;
          return { success: true };
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Supabase save failed');
          if (attempt < 3) {
            // Wait before retry: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
          }
        }
      }
      
      reportError({
        code: 'SAVE_FAILED',
        message: `Supabase save failed after 3 attempts: ${lastError?.message}`,
        recoverable: true,
      });
      return { success: true, error: 'Saved locally only - cloud sync failed' };
    } catch (err) {
      reportError({
        code: 'SAVE_FAILED',
        message: err instanceof Error ? err.message : 'Unknown save error',
        recoverable: true,
      });
      return { success: true, error: 'Saved locally only - cloud sync failed' };
    }
  }
  
  return { success: true };
}

/**
 * Delete a dream (local + Supabase).
 */
export async function deleteDream(id: string): Promise<void> {
  const local = loadLocal().filter(d => d.id !== id);
  saveLocal(local);

  const supabase = getSupabase();
  if (supabase && _user) {
    try {
      await supabase.from('dreams').update({ is_deleted: true }).eq('id', id);
    } catch (err) {
      console.warn('[DreamService] Supabase delete failed:', err);
    }
  }
}

/**
 * Sync dreams from Supabase into local storage.
 * Merges with existing local dreams (doesn't overwrite newer local copies).
 */
export async function syncFromSupabase(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase || !_user) return 0;

  try {
    const profileId = await getProfileId(supabase, _user.id);
    if (!profileId) return 0;

    const { data, error } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', profileId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) return 0;

    const local = loadLocal();
    const localMap = new Map(local.map(d => [d.id, d]));
    let merged = 0;

    for (const record of data) {
      const remote = recordToDream(record);
      const existing = localMap.get(remote.id);
      if (!existing) {
        local.push(remote);
        merged++;
      } else if (new Date(remote.updatedAt) > new Date(existing.updatedAt)) {
        const idx = local.findIndex(d => d.id === remote.id);
        if (idx >= 0) local[idx] = remote;
        merged++;
      }
    }

    if (merged > 0) {
      saveLocal(local);
      console.log(`[DreamService] Synced ${merged} dreams from Supabase`);
    }

    return merged;
  } catch (err) {
    console.warn('[DreamService] Sync failed:', err);
    return 0;
  }
}

/**
 * Generate a unique dream ID.
 */
export function generateDreamId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dream-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
