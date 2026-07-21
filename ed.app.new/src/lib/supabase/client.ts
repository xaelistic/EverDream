/**
 * Supabase Client Configuration
 *
 * Environment variables needed (add to .env):
 *   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
 *   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
 *
 * For n8n webhooks:
 *   VITE_N8N_WEBHOOK_URL=https://YOUR_N8N_URL/webhook
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { consumeAuthRedirectAndCleanUrl } from '../auth/urlCleanup';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Credentials not configured in .env (or using placeholder). App will run in local-only / offline mode. See .env.example for setup. Real cloud features (sync, auth, NFTs) will be disabled until configured.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // PKCE keeps tokens out of the URL fragment (uses ?code= then strips it).
    // Magic-link / some email flows may still use hash tokens — cleaned by urlCleanup.
    flowType: 'pkce',
  },
  db: {
    schema: 'public',
  },
});

/**
 * Consume OAuth / magic-link tokens from the URL and strip them from history.
 * Resolves before React mounts so the address bar never keeps secrets.
 */
export const authRedirectReady: Promise<{ wasRecovery: boolean; hadArtifacts: boolean }> =
  typeof window !== 'undefined'
    ? consumeAuthRedirectAndCleanUrl(async () => {
        await supabase.auth.getSession();
      })
    : Promise.resolve({ wasRecovery: false, hadArtifacts: false });

// ============================================================
// AUTH HELPERS
// ============================================================

export async function signInAnonymously(): Promise<{ user: User | null; error: Error | null }> {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) return { user: null, error };
  return { user: data.user, error: null };
}

export async function signInWithEmail(email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  return { error };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Record<string, unknown> | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // No profile yet, create one
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({ auth_user_id: user.id })
      .select()
      .single();
    return newProfile;
  }

  return data;
}

// ============================================================
// DREAM CRUD
// ============================================================

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

export async function fetchDreams(userId: string, limit = 100): Promise<DreamRecord[]> {
  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Supabase] fetchDreams error:', error);
    return [];
  }
  return data || [];
}

export async function insertDream(dream: Partial<DreamRecord>): Promise<DreamRecord | null> {
  const { data, error } = await supabase
    .from('dreams')
    .insert(dream)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] insertDream error:', error);
    return null;
  }
  return data;
}

export async function updateDream(id: string, updates: Partial<DreamRecord>): Promise<DreamRecord | null> {
  const { data, error } = await supabase
    .from('dreams')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] updateDream error:', error);
    return null;
  }
  return data;
}

export async function softDeleteDream(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('dreams')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
}

// ============================================================
// SLEEP SESSION CRUD
// ============================================================

export interface SleepSessionRecord {
  id: string;
  user_id: string;
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
  morning_check_in?: Record<string, unknown>;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export async function fetchSleepSessions(userId: string, limit = 100): Promise<SleepSessionRecord[]> {
  const { data, error } = await supabase
    .from('sleep_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('sleep_start', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Supabase] fetchSleepSessions error:', error);
    return [];
  }
  return data || [];
}

export async function insertSleepSession(session: Partial<SleepSessionRecord>): Promise<SleepSessionRecord | null> {
  const { data, error } = await supabase
    .from('sleep_sessions')
    .insert(session)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] insertSleepSession error:', error);
    return null;
  }
  return data;
}

export async function updateSleepSession(id: string, updates: Partial<SleepSessionRecord>): Promise<SleepSessionRecord | null> {
  const { data, error } = await supabase
    .from('sleep_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] updateSleepSession error:', error);
    return null;
  }
  return data;
}

// ============================================================
// USER SETTINGS
// ============================================================

export async function fetchUserSettings(userId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) {
    console.error('[Supabase] fetchUserSettings error:', error);
    return null;
  }
  return data;
}

export async function upsertUserSettings(userId: string, settings: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ ...settings, user_id: userId, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] upsertUserSettings error:', error);
    return null;
  }
  return data;
}

// ============================================================
// NFT CRUD
// ============================================================

export interface NFTRecord {
  id: string;
  dream_id: string | null;
  user_id: string;
  owner_address: string;
  creator_address: string;
  name: string;
  description: string | null;
  image_url: string | null;
  animation_url: string | null;
  external_url: string | null;
  metadata: Record<string, unknown> | null;
  attributes: Record<string, unknown>[] | null;
  status: 'pending' | 'minted' | 'failed';
  tx_hash: string | null;
  contract_address: string | null;
  token_id: string | null;
  parent_nft_ids: string[] | null;
  royalty_splits: Record<string, unknown> | null;
  license: string;
  allow_remix: boolean;
  minted_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchNFTs(userId: string, limit = 100): Promise<NFTRecord[]> {
  const { data, error } = await supabase
    .from('nfts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Supabase] fetchNFTs error:', error);
    return [];
  }
  return data || [];
}

export async function insertNFT(nft: Partial<NFTRecord>): Promise<NFTRecord | null> {
  const { data, error } = await supabase
    .from('nfts')
    .insert(nft)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] insertNFT error:', error);
    return null;
  }
  return data;
}

export async function updateNFT(id: string, updates: Partial<NFTRecord>): Promise<NFTRecord | null> {
  const { data, error } = await supabase
    .from('nfts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] updateNFT error:', error);
    return null;
  }
  return data;
}

// ============================================================
// DREAM ASSETS CRUD
// ============================================================

export interface DreamAssetRecord {
  id: string;
  dream_id: string;
  user_id: string;
  asset_type: string;
  prompt: string | null;
  url: string | null;
  source: string | null;
  style: string;
  metadata: Record<string, unknown> | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  attempts: number;
  created_at: string;
  completed_at: string | null;
}

export async function insertDreamAsset(asset: Partial<DreamAssetRecord>): Promise<DreamAssetRecord | null> {
  const { data, error } = await supabase
    .from('dream_assets')
    .insert(asset)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] insertDreamAsset error:', error);
    return null;
  }
  return data;
}

export async function fetchDreamAssets(dreamId: string): Promise<DreamAssetRecord[]> {
  const { data, error } = await supabase
    .from('dream_assets')
    .select('*')
    .eq('dream_id', dreamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] fetchDreamAssets error:', error);
    return [];
  }
  return data || [];
}
