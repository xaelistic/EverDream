/**
 * User profile — local persistence with optional Supabase sync.
 *
 * IMPORTANT: cache is scoped per auth user id. A single shared localStorage
 * key used to leak avatars / interests across logins (login as B still showed A's photo).
 */

import { getProfile, getCurrentUser, supabase } from './supabase/client';
import {
  goalIdsFromLabels,
  goalLabels,
  type OnboardingGoalId,
} from './onboarding/model';

/** Legacy unscoped key — migrated once then removed */
const LEGACY_STORAGE_KEY = 'everdream-user-profile';
const STORAGE_PREFIX = 'everdream-user-profile:v1:';

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
  /** Auth user this cache belongs to — never show another account's data */
  authUserId?: string | null;
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
  authUserId: null,
};

function generateFriendCode(): string {
  return `DREAM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function slugifyHandle(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'dreamer';
}

function storageKeyForUser(userId: string | null | undefined): string {
  if (userId) return `${STORAGE_PREFIX}${userId}`;
  return `${STORAGE_PREFIX}anonymous`;
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

function parseStoredProfile(raw: string): UserProfile | null {
  try {
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
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : null,
      authUserId: typeof parsed.authUserId === 'string' ? parsed.authUserId : null,
    });
  } catch {
    return null;
  }
}

/**
 * Avatars uploaded to our bucket are always `.../avatars/{authUserId}.{ext}`.
 * Reject any storage avatar that isn't clearly for this user.
 * data: URLs are only OK when the profile row is already tagged with this user.
 */
export function avatarBelongsToUser(
  url: string | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (!url || !userId) return false;
  const cleaned = url.split('?')[0];
  // Supabase storage path pattern
  if (cleaned.includes('/avatars/') || cleaned.includes('avatars%2F')) {
    const decoded = decodeURIComponent(cleaned);
    // Require exact segment avatars/{userId}. or avatars/{userId}/
    const re = new RegExp(`avatars[/]${userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([./]|$)`);
    return re.test(decoded);
  }
  // Local data-URL fallbacks: only allowed when caller also checks authUserId match
  if (url.startsWith('data:image/')) return true;
  // Unknown absolute URLs — do not trust across accounts
  return false;
}

export function sanitizeAvatarUrl(
  url: string | null | undefined,
  userId: string | null | undefined,
): string | null {
  if (!url) return null;
  return avatarBelongsToUser(url, userId) ? url : null;
}

function loadFromStorage(userId: string | null): UserProfile | null {
  try {
    // Always drop the old unscoped key — it caused cross-account avatar leaks
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) localStorage.removeItem(LEGACY_STORAGE_KEY);

    if (!userId) return null;

    const key = storageKeyForUser(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const profile = parseStoredProfile(raw);
    if (!profile) {
      localStorage.removeItem(key);
      return null;
    }

    // Strict: only accept cache already tagged for THIS user. Never claim untagged cache.
    if (profile.authUserId !== userId) {
      localStorage.removeItem(key);
      return null;
    }

    profile.avatarUrl = sanitizeAvatarUrl(profile.avatarUrl, userId);
    return profile;
  } catch {
    /* ignore */
  }
  return null;
}

function saveToStorage(profile: UserProfile, userId: string | null): void {
  try {
    const key = storageKeyForUser(userId || profile.authUserId);
    const toSave = {
      ...profile,
      authUserId: userId || profile.authUserId || null,
    };
    localStorage.setItem(key, JSON.stringify(toSave));
    // Ensure legacy key is gone so it cannot re-infect other sessions
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    console.warn('[Profile] localStorage save failed:', e);
  }
}

/** Clear cached profile for a user (call on sign-out / account switch). */
export function clearProfileCache(userId?: string | null): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(storageKeyForUser(null));
    if (userId) {
      localStorage.removeItem(storageKeyForUser(userId));
    }
    // Always sweep every scoped profile key on logout/switch — safest against leaks
    if (typeof localStorage !== 'undefined') {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k === LEGACY_STORAGE_KEY || k.startsWith(STORAGE_PREFIX))) {
          // When userId given, still remove ALL keys so a switch never reuses another slot
          toRemove.push(k);
        }
      }
      for (const k of toRemove) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
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
    const current =
      profile.interestSources[trimmed] ||
      profile.interestSources[
        profile.interests.find((i) => i.toLowerCase() === trimmed.toLowerCase()) || trimmed
      ];
    if (current === 'onboarding' || current === 'spotify' || current === 'meta') {
      return profile;
    }
    const key =
      profile.interests.find((i) => i.toLowerCase() === trimmed.toLowerCase()) || trimmed;
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

function emptyProfileForUser(userId: string | null): UserProfile {
  return {
    ...DEFAULT_PROFILE,
    friendCode: generateFriendCode(),
    authUserId: userId,
  };
}

/**
 * Apply remote profile row as source of truth for identity fields.
 * Avatar: always take remote (including null) so we never keep another user's photo.
 */
function applyRemoteRow(base: UserProfile, row: Record<string, unknown>, userId: string): UserProfile {
  let profile: UserProfile = {
    ...base,
    authUserId: userId,
  };

  // Identity from remote when present
  if (typeof row.display_name === 'string' && row.display_name) {
    profile.displayName = row.display_name;
    profile.handle = slugifyHandle(row.display_name);
  } else if (row.display_name === null || row.display_name === '') {
    // New account with no name — don't keep previous account name from cache
    // Only clear if we just switched users (base was empty or same user id already)
    if (!base.authUserId || base.authUserId === userId) {
      // keep local name for same user offline edits unless remote explicitly empty and we loaded fresh
    }
  }

  // Avatar: remote always wins when a profile row exists (and must belong to this user)
  if (typeof row.avatar_url === 'string' && row.avatar_url.trim()) {
    profile.avatarUrl = sanitizeAvatarUrl(row.avatar_url.trim(), userId);
  } else {
    // Explicit null/empty on server → no avatar (do not keep cached image)
    profile.avatarUrl = null;
  }

  if (Array.isArray(row.interests)) {
    const remoteInterests = (row.interests as string[]).filter(Boolean);
    // When remote has interests array (even empty after onboarding), prefer remote for multi-account safety
    // Only replace if remote sent a non-null array (it did)
    const sources = { ...profile.interestSources };
    if (remoteInterests.length > 0) {
      for (const label of remoteInterests) {
        if (!sources[label]) sources[label] = 'onboarding';
      }
      profile.interests = remoteInterests;
      profile.interestSources = sources;
    } else if (!base.authUserId || base.authUserId !== userId) {
      // Account switch / fresh load: empty remote means empty interests
      profile.interests = [];
      profile.interestSources = {};
    }
  }

  if (Array.isArray(row.dream_goals)) {
    const goals = (row.dream_goals as string[]).filter(Boolean);
    if (goals.length > 0) {
      profile.dreamGoals = goals;
      if (!profile.onboardingGoalIds?.length) {
        profile.onboardingGoalIds = goalIdsFromLabels(profile.dreamGoals);
      }
    } else if (!base.authUserId || base.authUserId !== userId) {
      profile.dreamGoals = [];
      profile.onboardingGoalIds = [];
    }
  } else if (Array.isArray(row.onboarding_goals) && (row.onboarding_goals as string[]).length) {
    const ids = (row.onboarding_goals as string[]).filter(Boolean) as OnboardingGoalId[];
    profile.onboardingGoalIds = ids;
    if (!profile.dreamGoals.length) {
      profile.dreamGoals = goalLabels(ids);
    }
  }

  if (typeof row.onboarded_at === 'string') profile.onboardedAt = row.onboarded_at;
  if (typeof row.experience_level === 'string') profile.experienceLevel = row.experience_level;
  if (typeof row.dream_recall === 'string') profile.dreamRecall = row.dream_recall;

  return scrubPlaceholders(profile);
}

export async function loadUserProfile(): Promise<UserProfile> {
  const user = await getCurrentUser();
  const userId = user?.id ?? null;

  // Always start clean for identity — never seed avatar from untrusted cache first
  let profile = emptyProfileForUser(userId);
  const cached = loadFromStorage(userId);
  if (cached && cached.authUserId === userId) {
    // Reuse non-identity offline fields only; avatar still requires remote or path check
    profile = {
      ...cached,
      authUserId: userId,
      // Drop cached avatar until remote confirms (prevents stale cross-account data:image/*)
      avatarUrl: null,
    };
  }

  if (!profile.friendCode) {
    profile.friendCode = generateFriendCode();
  }

  try {
    const row = await getProfile();
    if (row && userId) {
      // Remote profile row is authoritative for avatar / name / goals on load
      profile = applyRemoteRow(profile, row as Record<string, unknown>, userId);
      const dn = (row as { display_name?: string | null }).display_name;
      if (typeof dn === 'string' && dn.trim()) {
        profile.displayName = dn;
        profile.handle = slugifyHandle(dn);
      }
      profile.avatarUrl = sanitizeAvatarUrl(profile.avatarUrl, userId);
      saveToStorage(profile, userId);
    } else if (!row && userId) {
      // New profile row: keep offline fields from matching cache only, never foreign avatar
      profile = {
        ...profile,
        authUserId: userId,
        avatarUrl: null,
      };
      saveToStorage(profile, userId);
    }
  } catch {
    // Offline: may restore path-validated avatar from matching cache only
    if (cached?.authUserId === userId) {
      profile.avatarUrl = sanitizeAvatarUrl(cached.avatarUrl, userId);
    }
  }

  profile.authUserId = userId;
  profile.avatarUrl = sanitizeAvatarUrl(profile.avatarUrl, userId);
  return profile;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const user = await getCurrentUser();
  const userId = user?.id ?? profile.authUserId ?? null;

  const normalized: UserProfile = scrubPlaceholders({
    ...profile,
    handle: slugifyHandle(profile.displayName || 'dreamer'),
    friendCode: profile.friendCode || generateFriendCode(),
    interestSources: profile.interestSources || {},
    onboardingGoalIds: profile.onboardingGoalIds || [],
    authUserId: userId,
    avatarUrl: sanitizeAvatarUrl(profile.avatarUrl, userId),
  });
  saveToStorage(normalized, userId);

  try {
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
  // Always path by user id so avatars cannot collide across accounts
  const path = user
    ? `avatars/${user.id}.${ext}`
    : `avatars/local-${Date.now()}.${ext}`;

  if (user && !import.meta.env.VITE_SUPABASE_URL?.includes('placeholder')) {
    const { error } = await supabase.storage
      .from('dream-media')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (!error) {
      const { data } = supabase.storage.from('dream-media').getPublicUrl(path);
      if (data?.publicUrl) {
        // Cache-bust so UI doesn't show previous object's browser-cached image
        return `${data.publicUrl}${data.publicUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
      }
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
  // Only current session profile is available offline
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(STORAGE_PREFIX)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const profile = parseStoredProfile(raw);
      if (!profile) continue;
      if (profile.handle !== handle) continue;
      if (profile.profileVisibility === 'private') return null;
      return profile;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export { slugifyHandle, generateFriendCode, DEFAULT_PROFILE };
