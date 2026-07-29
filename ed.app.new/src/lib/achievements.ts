/**
 * Achievements catalog + unlock helpers.
 * Stored as unlocked ids with timestamps; catalog defines all definitions.
 */

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** How to earn it (shown when locked) */
  howTo: string;
  category: 'journal' | 'social' | 'streak' | 'asset' | 'referral' | 'sleep';
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  {
    id: 'first_journal',
    title: 'First Entry',
    description: 'Created your first dream journal entry',
    icon: '📝',
    howTo: 'Capture any dream from Home or Record',
    category: 'journal',
  },
  // Legacy id from earlier builds — still recognised when unlocking first entry
  {
    id: 'first_dream',
    title: 'Dream Keeper',
    description: 'Recorded your first dream',
    icon: '🌟',
    howTo: 'Record your first dream',
    category: 'journal',
  },
  {
    id: 'first_share',
    title: 'Dream Sharer',
    description: 'Shared your first dream asset with the world',
    icon: '📣',
    howTo: 'Share a dream or generated image from Journal or dream detail',
    category: 'social',
  },
  {
    id: 'first_friend',
    title: 'Circle of Dreamers',
    description: 'Added your first friend',
    icon: '🤝',
    howTo: 'Send a friend request from Profile → Friends',
    category: 'social',
  },
  {
    id: 'first_referral',
    title: 'Dream Evangelist',
    description: 'Someone signed up with your referral code',
    icon: '🎁',
    howTo: 'Share your referral link from Achievements',
    category: 'referral',
  },
  {
    id: 'referral_subscriber',
    title: 'Patron Maker',
    description: 'A friend you referred subscribed to Plus or Pro',
    icon: '👑',
    howTo: 'When a referral upgrades, you both get a free month',
    category: 'referral',
  },
  {
    id: 'week_streak',
    title: 'Dedicated Dreamer',
    description: 'Recorded dreams for 7 days straight',
    icon: '🔥',
    howTo: 'Journal at least once a day for a week',
    category: 'streak',
  },
  {
    id: 'ten_dreams',
    title: 'Dream Explorer',
    description: 'Recorded 10 dreams',
    icon: '🎯',
    howTo: 'Keep journaling — 10 entries unlock this',
    category: 'journal',
  },
  {
    id: 'first_lucid',
    title: 'Lucid Awakening',
    description: 'Recorded your first lucid dream',
    icon: '✨',
    howTo: 'Tag or capture a lucid dream',
    category: 'journal',
  },
  {
    id: 'rare_asset',
    title: 'Rare Dreamer',
    description: 'Created a high-rarity dream asset',
    icon: '💎',
    howTo: 'Generate an image for a dream that scores high rarity',
    category: 'asset',
  },
  {
    id: 'dream_master',
    title: 'Dream Master',
    description: 'Recorded 50 dreams',
    icon: '🏆',
    howTo: 'Build a deep journal of 50 entries',
    category: 'journal',
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Recorded dreams for 30 days straight',
    icon: '🌙',
    howTo: 'Keep a 30-day journaling streak',
    category: 'streak',
  },
];

/** Achievements shown in UI (hide pure legacy duplicate if first_journal exists). */
export const DISPLAY_ACHIEVEMENTS = ACHIEVEMENT_CATALOG.filter((a) => a.id !== 'first_dream');

const STORAGE_KEY = 'achievements';

export function loadUnlockedAchievements(): UnlockedAchievement[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    // Prefer window.storage if used elsewhere — caller may merge
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((a: { id: string; unlockedAt?: string }) => ({
      id: a.id,
      unlockedAt: a.unlockedAt || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export function isUnlocked(
  unlocked: UnlockedAchievement[] | { id: string }[],
  id: string,
): boolean {
  if (id === 'first_journal' || id === 'first_dream') {
    return unlocked.some((a) => a.id === 'first_journal' || a.id === 'first_dream');
  }
  return unlocked.some((a) => a.id === id);
}

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENT_CATALOG.find((a) => a.id === id);
}

export type UnlockResult = {
  unlocked: UnlockedAchievement[];
  newlyUnlocked: AchievementDef[];
};

/**
 * Unlock by id if not already unlocked. Returns full list + newly unlocked defs.
 */
export function unlockAchievement(
  current: UnlockedAchievement[] | { id: string; unlockedAt?: string; title?: string; description?: string; icon?: string }[],
  id: string,
): UnlockResult {
  const normalized: UnlockedAchievement[] = current.map((a) => ({
    id: a.id,
    unlockedAt: a.unlockedAt || new Date().toISOString(),
  }));

  if (isUnlocked(normalized, id)) {
    return { unlocked: normalized, newlyUnlocked: [] };
  }

  // Prefer canonical first_journal over legacy first_dream
  const canonicalId = id === 'first_dream' ? 'first_journal' : id;
  if (isUnlocked(normalized, canonicalId)) {
    return { unlocked: normalized, newlyUnlocked: [] };
  }

  const def = getAchievementDef(canonicalId) || getAchievementDef(id);
  if (!def) {
    return { unlocked: normalized, newlyUnlocked: [] };
  }

  const entry: UnlockedAchievement = {
    id: def.id,
    unlockedAt: new Date().toISOString(),
  };

  return {
    unlocked: [...normalized, entry],
    newlyUnlocked: [def],
  };
}

/** Evaluate dream-based achievements after journal save. */
export function evaluateDreamAchievements(
  current: UnlockedAchievement[] | { id: string; unlockedAt?: string }[],
  dreams: { category?: string; assetMetadata?: { rarityScore?: number }; date?: string; isSample?: boolean }[],
  calculateStreak: (dreams: unknown[]) => number,
): UnlockResult {
  let unlocked = current.map((a) => ({
    id: a.id,
    unlockedAt: a.unlockedAt || new Date().toISOString(),
  }));
  const newlyUnlocked: AchievementDef[] = [];

  const real = dreams.filter((d) => !d.isSample);

  const tryUnlock = (id: string) => {
    const result = unlockAchievement(unlocked, id);
    unlocked = result.unlocked;
    newlyUnlocked.push(...result.newlyUnlocked);
  };

  if (real.length >= 1) tryUnlock('first_journal');
  if (real.length >= 10) tryUnlock('ten_dreams');
  if (real.length >= 50) tryUnlock('dream_master');

  const streak = calculateStreak(real);
  if (streak >= 7) tryUnlock('week_streak');
  if (streak >= 30) tryUnlock('night_owl');

  if (real.some((d) => d.category === 'lucid')) tryUnlock('first_lucid');
  if (real.some((d) => (d.assetMetadata?.rarityScore ?? 0) > 0.8)) tryUnlock('rare_asset');

  return { unlocked, newlyUnlocked };
}

/** Merge unlocked list with catalog for UI cards. */
export function buildAchievementCards(
  unlocked: UnlockedAchievement[] | { id: string; unlockedAt?: string }[],
) {
  const unlockedMap = new Map(
    unlocked.map((a) => [a.id, a.unlockedAt || new Date().toISOString()]),
  );
  // Map legacy first_dream → first_journal display
  if (unlockedMap.has('first_dream') && !unlockedMap.has('first_journal')) {
    unlockedMap.set('first_journal', unlockedMap.get('first_dream')!);
  }

  return DISPLAY_ACHIEVEMENTS.map((def) => ({
    ...def,
    unlocked: unlockedMap.has(def.id),
    unlockedAt: unlockedMap.get(def.id) || null,
  }));
}
