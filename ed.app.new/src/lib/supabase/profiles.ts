/**
 * Profile Operations — Supabase Data Layer
 *
 * Provides typed CRUD functions for the `profiles` table.
 * Profiles are linked to Supabase auth.users via `auth_user_id`.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Your Supabase anon/public key
 *
 * @module supabase/profiles
 */

import { supabase } from './client';

// ── Types ────────────────────────────────────────────────────

export interface ProfileRecord {
  id: string;
  auth_user_id: string;
  display_name: string;
  avatar_url?: string;
  tradition: 'buddhist' | 'celtic' | 'scientific' | 'general';
  circadian_goal: string;
  created_at: string;
  updated_at: string;
  // Onboarding
  onboarded_at?: string;
  birth_date?: string;
  gender?: 'female' | 'male' | 'non-binary' | 'prefer-not';
  onboarding_goals?: string[];
  interests?: string[];
  dream_goals?: string[];
  experience_level?: string;
  dream_recall?: string;
  average_sleep_hours?: number;
  // Account access
  is_admin?: boolean;
  subscription_tier?: 'free' | 'plus' | 'pro';
}

export type ProfileInsert = Partial<Omit<ProfileRecord, 'auth_user_id'>>;
export type ProfileUpdate = Partial<Omit<ProfileRecord, 'id' | 'auth_user_id' | 'created_at' | 'updated_at'>>;

// ── Profile Operations ────────────────────────────────────────

/**
 * Get the current authenticated user's profile.
 * If no profile exists, attempts to create one automatically.
 *
 * @returns The user's ProfileRecord, or null if not authenticated
 *
 * @example
 * ```ts
 * const profile = await getMyProfile();
 * if (profile) console.log(profile.display_name);
 * ```
 */
export async function getMyProfile(): Promise<ProfileRecord | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  if (profile) return profile;

  // Auto-create profile if it doesn't exist
  return createProfile(user.id, {
    display_name: user.email?.split('@')[0] || 'dreamer',
  });
}

/**
 * Get a profile by the auth_user_id.
 *
 * @param authUserId — The Supabase auth.users UUID
 * @returns The ProfileRecord, or null if not found
 */
export async function getProfile(authUserId: string): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found
      return null;
    }
    console.error('[profiles] getProfile error:', error);
    return null;
  }
  return data;
}

/**
 * Get a profile by the profile UUID (not the auth_user_id).
 *
 * @param profileId — The profiles table UUID
 * @returns The ProfileRecord, or null if not found
 */
export async function getProfileById(profileId: string): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error) {
    console.error('[profiles] getProfileById error:', error);
    return null;
  }
  return data;
}

/**
 * Create a new profile for a user.
 *
 * @param authUserId — The Supabase auth.users UUID
 * @param data — Profile data (display_name, etc.)
 * @returns The created ProfileRecord, or null on error
 *
 * @example
 * ```ts
 * const profile = await createProfile(user.id, {
 *   display_name: 'Dream Walker',
 *   tradition: 'celtic',
 *   circadian_goal: 'better_dreams',
 * });
 * ```
 */
export async function createProfile(authUserId: string, data: ProfileInsert): Promise<ProfileRecord | null> {
  const { data: created, error } = await supabase
    .from('profiles')
    .insert({
      auth_user_id: authUserId,
      display_name: data.display_name || 'dreamer',
      avatar_url: data.avatar_url,
      tradition: data.tradition || 'general',
      circadian_goal: data.circadian_goal || 'better_dreams',
    })
    .select()
    .single();

  if (error) {
    console.error('[profiles] createProfile error:', error);
    return null;
  }
  return created;
}

/**
 * Update the current user's profile.
 *
 * @param authUserId — The Supabase auth.users UUID
 * @param data — Partial profile data to update
 * @returns The updated ProfileRecord, or null on error
 *
 * @example
 * ```ts
 * const updated = await updateProfile(user.id, {
 *   display_name: 'Lucid Explorer',
 *   tradition: 'scientific',
 * });
 * ```
 */
export async function updateProfile(authUserId: string, data: ProfileUpdate): Promise<ProfileRecord | null> {
  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('auth_user_id', authUserId)
    .select()
    .single();

  if (error) {
    console.error('[profiles] updateProfile error:', error);
    return null;
  }
  return updated;
}

/**
 * Update the current user's profile by profile UUID.
 *
 * @param profileId — The profiles table UUID
 * @param data — Partial profile data to update
 * @returns The updated ProfileRecord, or null on error
 */
export async function updateProfileById(profileId: string, data: ProfileUpdate): Promise<ProfileRecord | null> {
  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    console.error('[profiles] updateProfileById error:', error);
    return null;
  }
  return updated;
}

/**
 * Delete a profile by auth_user_id.
 * Cascades to dreams, sleep_sessions, etc. via ON DELETE CASCADE.
 *
 * @param authUserId — The Supabase auth.users UUID
 * @returns true if successful, false on error
 */
export async function deleteProfile(authUserId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('auth_user_id', authUserId);

  if (error) {
    console.error('[profiles] deleteProfile error:', error);
    return false;
  }
  return true;
}

/**
 * Check if a profile exists for the given auth_user_id.
 *
 * @param authUserId — The Supabase auth.users UUID
 * @returns true if a profile exists
 */
export async function profileExists(authUserId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('auth_user_id', authUserId);

  if (error) {
    console.error('[profiles] profileExists error:', error);
    return false;
  }
  return (count || 0) > 0;
}
