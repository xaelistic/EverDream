/**
 * User profile — local persistence with optional Supabase sync
 * for display_name and avatar_url.
 */

import { getProfile, getCurrentUser, supabase } from './supabase/client';

const STORAGE_KEY = 'everdream-user-profile';

export type ProfileVisibility = 'private' | 'friends' | 'public';

export interface UserProfile {
  displayName: string;
  handle: string;
  bio: string;
  interests: string[];
  dreamGoals: string[];
  friendCode: string;
  avatarUrl: string | null;
  profileVisibility: ProfileVisibility;
}

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'DreamWalker',
  handle: 'dreamwalker',
  bio: 'Exploring the landscapes of sleep and subconscious...',
  interests: ['Lucid Dreaming', 'Psychology', 'Art', 'Meditation'],
  dreamGoals: ['Better Sleep', 'Creative Inspiration', 'Self-Discovery'],
  friendCode: '',
  avatarUrl: null,
  profileVisibility: 'friends',
};

function generateFriendCode(): string {
  return `DREAM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function slugifyHandle(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'dreamer';
}

function loadFromStorage(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

function saveToStorage(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('[Profile] localStorage save failed:', e);
  }
}

export async function loadUserProfile(): Promise<UserProfile> {
  let profile = loadFromStorage() ?? { ...DEFAULT_PROFILE };

  if (!profile.friendCode) {
    profile.friendCode = generateFriendCode();
    saveToStorage(profile);
  }

  try {
    const row = await getProfile();
    if (row) {
      if (row.display_name && typeof row.display_name === 'string') {
        profile.displayName = row.display_name;
        profile.handle = slugifyHandle(row.display_name);
      }
      if (row.avatar_url && typeof row.avatar_url === 'string') {
        profile.avatarUrl = row.avatar_url;
      }
      saveToStorage(profile);
    }
  } catch {
    // Supabase unavailable — local only
  }

  return profile;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const normalized: UserProfile = {
    ...profile,
    handle: slugifyHandle(profile.displayName),
    friendCode: profile.friendCode || generateFriendCode(),
  };
  saveToStorage(normalized);

  try {
    const user = await getCurrentUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({
        display_name: normalized.displayName,
        avatar_url: normalized.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_user_id', user.id);
  } catch (e) {
    console.warn('[Profile] Supabase sync failed:', e);
  }
}

export async function uploadAvatar(file: File): Promise<string> {
  const user = await getCurrentUser();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = user
    ? `avatars/${user.id}.${ext}`
    : `avatars/local-${Date.now()}.${ext}`;

  if (user && !import.meta.env.VITE_SUPABASE_URL?.includes('placeholder')) {
    const { error } = await supabase.storage
      .from('dream-media')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (!error) {
      const { data } = supabase.storage.from('dream-media').getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

export function getPublicProfileByHandle(handle: string): UserProfile | null {
  const profile = loadFromStorage();
  if (!profile) return null;
  if (profile.handle !== handle) return null;
  if (profile.profileVisibility === 'private') return null;
  return profile;
}

export { slugifyHandle, generateFriendCode };