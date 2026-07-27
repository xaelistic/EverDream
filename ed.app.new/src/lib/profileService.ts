/**
 * User profile — local persistence with optional Supabase sync.
 * Interests & dream goals come from onboarding, manual edits, and social signals
 * (Spotify / Meta) — never fake placeholder people or seeded demo junk.
 */

import { getProfile, getCurrentUser, supabase } from './supabase/client';
import {
  goalIdsFromLabels,
  goalLabels,
  type OnboardingGoalId,
} from './onboarding/model';

const STORAGE_KEY = 'everdream-user-profile';

export type ProfileVisibility = 'private' | 'friends' | 'public';

export type InterestSource = 'onboarding' | 'manual' | 'spotify' | 'meta';

export interface UserProfile {
  displayName: string;
  handle: string;
  bio: string;
  /** Display labels (union of all sources) */
  interests: string[];
  dreamGoals: string[];
  /** Per-interest provenance for Tinder-style source chips */
  interestSources: Record<string, InterestSource>;
  /** Canonical onboarding goal ids for re-opening onboarding preselected */
  onboardingGoalIds: OnboardingGoalId[];
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
  interestSources: {},
  onboardingGoalIds: [],
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

/**
 * Only scrub the exact old demo seed combo (all four interests + three goals).
 * Never strip legitimate onboarding picks like "Psychology" or "Better Sleep" alone.
 */
function scrubPlaceholders(profile: UserProfile): UserProfile {
  const interestLc = profile.interests.map((i) => i.toLowerCase()).sort();
  const goalLc = profile.dreamGoals.map((g) => g.toLowerCase()).sort();
  const legacyInterests = ['art', 'lucid dreaming', 'meditation', 'psychology'];
  const legacyGoals = ['better sleep', 'creative inspiration', 'self-discovery'];

  const isLegacyShell =
    interestLc.length === 4 &&
    legacyInterests.every((x, i) => interestLc[i] === x) &&
    goalLc.length === 3 &&
    legacyGoals.every((x, i) => goalLc[i] === x);

  let interests = profile.interests;
  let dreamGoals = profile.dreamGoals;
  let interestSources = { ...profile.interestSources };
  let displayName = profile.displayName;
  let bio = profile.bio;

  if (isLegacyShell) {
    interests = [];
    dreamGoals = [];
    interestSources = {};
  }
  if (displayName === 'DreamWalker') displayName = '';
  if (bio.startsWith('Exploring the landscapes of sleep')) bio = '';

  // Rebuild sources map for known labels
  const nextSources: Record<string, InterestSource> = {};
  for (const label of interests) {
    nextSources[label] = interestSources[label] || 'manual';
  }

  return {
    ...profile,
    displayName,
    bio,
    interests,
    dreamGoals,
    interestSources: nextSources,
    onboardingGoalIds: profile.onboardingGoalIds || [],
  };
}

function loadFromStorage(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return scrubPlaceholders({
      ...DEFAULT_PROFILE,
      ...parsed,
      interests: Array.isArray(parsed.interests) ? parsed.interests : [],
      dreamGoals: Array.isArray(parsed.dreamGoals) ? parsed.dreamGoals : [],
      interestSources: parsed.interestSources || {},
      onboardingGoalIds: Array.isArray(parsed.onboardingGoalIds)
        ? (parsed.onboardingGoalIds as OnboardingGoalId[])
        : [],
    });
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

function mergeInterest(
  profile: UserProfile,
  label: string,
  source: InterestSource,
): UserProfile {
  const trimmed = label.trim();
  if (!trimmed) return profile;
  const exists = profile.interests.some((i) => i.toLowerCase() === trimmed.toLowerCase());
  if (exists) {
    // Don't downgrade social → manual if already social; upgrade manual → social ok
    const current = profile.interestSources[trimmed] || profile.interestSources[
      profile.interests.find((i) => i.toLowerCase() === trimmed.toLowerCase()) || trimmed
    ];
    if (current === 'onboarding' || current === 'spotify' || current === 'meta') {
      return profile;
    }
    const key = profile.interests.find((i) => i.toLowerCase() === trimmed.toLowerCase()) || trimmed;
    return {
      ...profile,
      interestSources: { ...profile.interestSources, [key]: source },
    };
  }
  return {
    ...profile,
    interests: [...profile.interests, trimmed],
    interestSources: { ...profile.interestSources, [trimmed]: source },
  };
}

export function addInterestToProfile(
  profile: UserProfile,
  label: string,
  source: InterestSource = 'manual',
): UserProfile {
  return scrubPlaceholders(mergeInterest(profile, label, source));
}

export function mergeInterestsIntoProfile(
  profile: UserProfile,
  labels: string[],
  source: InterestSource,
): UserProfile {
  let next = profile;
  for (const label of labels) {
    next = mergeInterest(next, label, source);
  }
  return scrubPlaceholders(next);
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

      if (Array.isArray(r.interests) && (r.interests as string[]).length) {
        const remoteInterests = (r.interests as string[]).filter(Boolean);
        // Prefer remote list when present; keep local source tags when labels match
        const sources = { ...profile.interestSources };
        for (const label of remoteInterests) {
          if (!sources[label]) sources[label] = 'onboarding';
        }
        profile.interests = remoteInterests;
        profile.interestSources = sources;
      }

      if (Array.isArray(r.dream_goals) && (r.dream_goals as string[]).length) {
        profile.dreamGoals = (r.dream_goals as string[]).filter(Boolean);
        if (!profile.onboardingGoalIds?.length) {
          profile.onboardingGoalIds = goalIdsFromLabels(profile.dreamGoals);
        }
      } else if (Array.isArray(r.onboarding_goals) && (r.onboarding_goals as string[]).length) {
        const ids = (r.onboarding_goals as string[]).filter(Boolean) as OnboardingGoalId[];
        profile.onboardingGoalIds = ids;
        if (!profile.dreamGoals.length) {
          profile.dreamGoals = goalLabels(ids);
        }
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
    interestSources: profile.interestSources || {},
    onboardingGoalIds: profile.onboardingGoalIds || [],
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
      onboarding_goals: normalized.onboardingGoalIds,
    };
    if (normalized.experienceLevel) update.experience_level = normalized.experienceLevel;
    if (normalized.dreamRecall) update.dream_recall = normalized.dreamRecall;
    if (normalized.onboardedAt) update.onboarded_at = normalized.onboardedAt;

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
