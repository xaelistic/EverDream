import { supabase } from '../supabase/client';
import type { OnboardingProfilePayload } from './model';
import {
  goalLabels,
  interestLabels,
  interestIdsFromLabels,
  goalIdsFromLabels,
  type OnboardingGoalId,
  type InterestId,
} from './model';
import {
  loadUserProfile,
  saveUserProfile,
  mergeInterestsIntoProfile,
  type UserProfile,
} from '../profileService';
import { deriveInterestSignals, hydrateSignalsFromLinkedAccounts } from '../social/profileSignals';

/**
 * Persist onboarding answers to Supabase profiles + local UserProfile cache.
 * Local write always runs so the UI has data even if a column is missing remotely.
 * Merges social-sourced interests (Spotify / Meta) so they aren't wiped.
 */
export async function saveOnboardingToProfile(
  authUserId: string,
  payload: OnboardingProfilePayload,
): Promise<void> {
  const local = await loadUserProfile();

  // Preserve social-sourced interests when re-saving onboarding
  const socialEntries = Object.entries(local.interestSources || {}).filter(
    ([, src]) => src === 'spotify' || src === 'meta',
  );

  let nextLocal: UserProfile = {
    ...local,
    displayName: payload.display_name?.trim() || local.displayName,
    dreamGoals: payload.dream_goals ?? [],
    onboardingGoalIds: (payload.onboarding_goals || []) as OnboardingGoalId[],
    onboardedAt: payload.onboarded_at || local.onboardedAt || new Date().toISOString(),
    experienceLevel: payload.experience_level ?? local.experienceLevel,
    dreamRecall: payload.dream_recall ?? local.dreamRecall,
    interests: [],
    interestSources: {},
  };

  nextLocal = mergeInterestsIntoProfile(
    nextLocal,
    payload.interests ?? [],
    'onboarding',
  );
  for (const [label, src] of socialEntries) {
    nextLocal = mergeInterestsIntoProfile(nextLocal, [label], src as 'spotify' | 'meta');
  }

  if (
    nextLocal.dreamGoals.length === 0 &&
    Array.isArray(payload.onboarding_goals) &&
    payload.onboarding_goals.length
  ) {
    nextLocal.dreamGoals = goalLabels(payload.onboarding_goals as OnboardingGoalId[]);
  }

  await saveUserProfile(nextLocal);

  const remote: Record<string, unknown> = {
    onboarded_at: payload.onboarded_at,
    onboarding_goals: payload.onboarding_goals ?? [],
    average_sleep_hours: payload.average_sleep_hours,
    birth_date: payload.birth_date,
    gender: payload.gender,
    updated_at: new Date().toISOString(),
    interests: nextLocal.interests,
    dream_goals: nextLocal.dreamGoals,
  };
  if (payload.display_name?.trim()) remote.display_name = payload.display_name.trim();
  if (payload.experience_level) remote.experience_level = payload.experience_level;
  if (payload.dream_recall) remote.dream_recall = payload.dream_recall;

  const { error } = await supabase.from('profiles').update(remote).eq('auth_user_id', authUserId);

  if (error) {
    const msg = error.message || '';
    if (/column|schema cache|does not exist/i.test(msg)) {
      const fallback = {
        onboarded_at: payload.onboarded_at,
        onboarding_goals: payload.onboarding_goals ?? [],
        average_sleep_hours: payload.average_sleep_hours,
        birth_date: payload.birth_date,
        gender: payload.gender,
        updated_at: new Date().toISOString(),
        ...(payload.display_name?.trim() ? { display_name: payload.display_name.trim() } : {}),
      };
      const { error: e2 } = await supabase
        .from('profiles')
        .update(fallback)
        .eq('auth_user_id', authUserId);
      if (e2) throw e2;
      return;
    }
    throw error;
  }
}

/**
 * Build onboarding answer seeds from existing profile + social signals.
 * Used when re-opening onboarding or if the user already linked social accounts.
 */
export async function loadOnboardingPrefill(): Promise<{
  goals: OnboardingGoalId[];
  interests: InterestId[];
  interestLabels: string[];
  experienceLevel: string | null;
  dreamRecall: string | null;
  displayName: string;
  socialInterestLabels: string[];
}> {
  const profile = await loadUserProfile();
  await hydrateSignalsFromLinkedAccounts();
  const social = deriveInterestSignals();

  let goals: OnboardingGoalId[] =
    profile.onboardingGoalIds?.length
      ? profile.onboardingGoalIds
      : goalIdsFromLabels(profile.dreamGoals || []);

  const interestLabels = profile.interests || [];
  let interests = interestIdsFromLabels(interestLabels);

  // Also map social suggestions onto onboarding interest chips when possible
  const socialInterestLabels = social.map((s) => s.label);
  const socialIds = interestIdsFromLabels(socialInterestLabels);
  for (const id of socialIds) {
    if (!interests.includes(id)) interests = [...interests, id];
  }

  return {
    goals,
    interests,
    interestLabels,
    experienceLevel: profile.experienceLevel ?? null,
    dreamRecall: profile.dreamRecall ?? null,
    displayName: profile.displayName || '',
    socialInterestLabels,
  };
}

/** Map stored goal ids or labels into education preference tags via model helpers. */
export function educationInputsFromProfile(row: {
  onboarding_goals?: string[] | null;
  interests?: string[] | null;
  dream_goals?: string[] | null;
}): { goalIds: OnboardingGoalId[]; interestIds: InterestId[]; interestLabels: string[] } {
  const rawGoals = row.onboarding_goals ?? [];
  let goalIds = rawGoals.filter((g): g is OnboardingGoalId =>
    [
      'better_recall',
      'understand_dreams',
      'visualize_dreams',
      'lucid_dreaming',
      'better_sleep',
      'emotional_insight',
      'creative_inspiration',
    ].includes(g),
  );

  if (!goalIds.length && row.dream_goals?.length) {
    goalIds = goalIdsFromLabels(row.dream_goals);
  }

  const labels = row.interests?.length
    ? row.interests
    : row.dream_goals?.length
      ? row.dream_goals
      : interestLabels([]);

  const interestIds = interestIdsFromLabels(labels);

  return { goalIds, interestIds, interestLabels: labels };
}
