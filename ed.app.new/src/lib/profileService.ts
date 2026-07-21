/**
 * User profile — local persistence with optional Supabase sync.
 * Interests & dream goals come only from onboarding or explicit edits (never placeholders).
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
  /** ISO from onboarding when available locally */
  onboardedAt?: string | null;
  experienceLevel?: string | null;
  dreamRecall?: string | null;
}

const DEFAULT_PROFILE: UserProfile = {
  displayName: '',
  handle: 'dreamer',
  bio: '',
  interests: [],
  dreamGoals: [],
  friendCode: '',
  avatarUrl: null,
  profileVisibility: 'friends',
  onboardedAt: null,
  experienceLevel: null,
  dreamRecall: null,
};

function generateFriendCode(): string {
  return `DREAM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function slugifyHandle(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'dreamer';
}

/** Strip legacy seeded demo values from older localStorage profiles. */
const LEGACY_PLACEHOLDER_INTERESTS = new Set(
  ['Lucid Dreaming', 'Psychology', 'Art', 'Meditation'].map((s) => s.toLowerCase()),
);
const LEGACY_PLACEHOLDER_GOALS = new Set(
  ['Better Sleep', 'Creative Inspiration', 'Self-Discovery'].map((s) => s.toLowerCase()),
);

function scrubPlaceholders(profile: UserProfile): UserProfile {
  const interests = profile.interests.filter(
    (i) => !LEGACY_PLACEHOLDER_INTERESTS.has(i.toLowerCase()),
  );
  const dreamGoals = profile.dreamGoals.filter(
    (g) => !LEGACY_PLACEHOLDER_GOALS.has(g.toLowerCase()),
  );
  // If scrub removed everything and name was default DreamWalker, treat as empty shell
  let displayName = profile.displayName;
  if (displayName === 'DreamWalker') displayName = '';
  let bio = profile.bio;
  if (bio.startsWith('Exploring the landscapes of sleep')) bio = '';
  return { ...profile, displayName, bio, interests, dreamGoals };
}

function loadFromStorage(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return scrubPlaceholders({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
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
      const r = row as Record<string, unknown>;
      if (Array.isArray(r.interests)) {
        profile.interests = (r.interests as string[]).filter(Boolean);
      }
      if (Array.isArray(r.dream_goals)) {
        profile.dreamGoals = (r.dream_goals as string[]).filter(Boolean);
      } else if (Array.isArray(r.onboarding_goals) && profile.dreamGoals.length === 0) {
        // leave ids out of dreamGoals display — labels only when present
      }
      if (typeof r.onboarded_at === 'string') profile.onboardedAt = r.onboarded_at;
      if (typeof r.experience_level === 'string') profile.experienceLevel = r.experience_level;
      if (typeof r.dream_recall === 'string') profile.dreamRecall = r.dream_recall;
      profile = scrubPlaceholders(profile);
      saveToStorage(profile);
    }
  } catch {
    // Supabase unavailable — local only
  }

  return profile;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const normalized: UserProfile = scrubPlaceholders({
    ...profile,
    handle: slugifyHandle(profile.displayName || 'dreamer'),
    friendCode: profile.friendCode || generateFriendCode(),
  });
  saveToStorage(normalized);

  try {
    const user = await getCurrentUser();
    if (!user) return;

    const update: Record<string, unknown> = {
      display_name: normalized.displayName || null,
      avatar_url: normalized.avatarUrl,
      updated_at: new Date().toISOString(),
      interests: normalized.interests,
      dream_goals: normalized.dreamGoals,
    };
    if (normalized.experienceLevel) update.experience_level = normalized.experienceLevel;
    if (normalized.dreamRecall) update.dream_recall = normalized.dreamRecall;

    const { error } = await supabase
      .from('profiles')
      .update(update)
      .eq('auth_user_id', user.id);

    if (error && /column|schema cache|does not exist/i.test(error.message || '')) {
      await supabase
        .from('profiles')
        .update({
          display_name: normalized.displayName || null,
          avatar_url: normalized.avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', user.id);
    }
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

export { slugifyHandle, generateFriendCode, DEFAULT_PROFILE };
