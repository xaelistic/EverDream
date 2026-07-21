import { supabase } from '../supabase/client';
import type { OnboardingProfilePayload } from './model';
import { goalLabels, interestLabels, type OnboardingGoalId, type InterestId } from './model';
import {
  loadUserProfile,
  saveUserProfile,
  type UserProfile,
} from '../profileService';

/**
 * Persist onboarding answers to Supabase profiles + local UserProfile cache.
 * Local write always runs so the UI has data even if a column is missing remotely.
 */
export async function saveOnboardingToProfile(
  authUserId: string,
  payload: OnboardingProfilePayload,
): Promise<void> {
  const local = await loadUserProfile();
  const nextLocal: UserProfile = {
    ...local,
    displayName: payload.display_name?.trim() || local.displayName,
    interests: payload.interests ?? [],
    dreamGoals: payload.dream_goals ?? [],
    // wipe placeholder defaults if any leftover
  };
  if (
    nextLocal.interests.length === 0 &&
    Array.isArray(payload.onboarding_goals) &&
    payload.onboarding_goals.length
  ) {
    // map goal ids → labels if interests empty but goals set
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
  };
  if (payload.display_name?.trim()) remote.display_name = payload.display_name.trim();
  if (payload.interests) remote.interests = payload.interests;
  if (payload.dream_goals) remote.dream_goals = payload.dream_goals;
  if (payload.experience_level) remote.experience_level = payload.experience_level;
  if (payload.dream_recall) remote.dream_recall = payload.dream_recall;

  const { error } = await supabase.from('profiles').update(remote).eq('auth_user_id', authUserId);

  if (error) {
    // Retry without newer columns if migration not applied yet
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

/** Map stored goal ids or labels into education preference tags via model helpers. */
export function educationInputsFromProfile(row: {
  onboarding_goals?: string[] | null;
  interests?: string[] | null;
  dream_goals?: string[] | null;
}): { goalIds: OnboardingGoalId[]; interestIds: InterestId[]; interestLabels: string[] } {
  const rawGoals = row.onboarding_goals ?? [];
  const goalIds = rawGoals.filter((g): g is OnboardingGoalId =>
    [
      'better_recall',
      'understand_dreams',
      'lucid_dreaming',
      'better_sleep',
      'emotional_insight',
      'creative_inspiration',
    ].includes(g),
  );

  const labels = row.interests?.length
    ? row.interests
    : row.dream_goals?.length
      ? row.dream_goals
      : interestLabels([]);

  // reverse-map interest labels → ids when possible
  const interestIds: InterestId[] = [];
  const known = [
    ['Lucid dreaming', 'lucid_dreaming'],
    ['Symbols & archetypes', 'dream_symbols'],
    ['Sleep science', 'sleep_science'],
    ['Nightmares & anxiety dreams', 'nightmares'],
    ['Meditation & wind-down', 'meditation'],
    ['Creativity', 'creativity'],
    ['Psychology', 'psychology'],
    ['Circadian rhythm', 'circadian'],
    ['Wearables & sleep data', 'wearables'],
    ['Journaling habit', 'journaling_habit'],
  ] as const;
  for (const label of labels) {
    const hit = known.find(([l]) => l.toLowerCase() === label.toLowerCase());
    if (hit) interestIds.push(hit[1]);
  }

  return { goalIds, interestIds, interestLabels: labels };
}
