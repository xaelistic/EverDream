import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadUserProfile,
  saveUserProfile,
  uploadAvatar,
  addInterestToProfile,
  clearProfileCache,
  type UserProfile,
  type InterestSource,
} from '../lib/profileService';
import {
  hydrateSignalsFromLinkedAccounts,
  linkSocialProviderForProfile,
  unlinkSocialProviderSignals,
  type SocialInterestSource,
} from '../lib/social/profileSignals';
import { goalIdsFromLabels } from '../lib/onboarding/model';
import { useAuth } from './use-auth';

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedForUser = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Do not paint until load finishes for this userId
      const data = await loadUserProfile();
      // Guard: never surface a profile tagged for a different auth user
      if (userId && data.authUserId !== userId) {
        clearProfileCache();
        setProfile(null);
        loadedForUser.current = userId;
        const clean = await loadUserProfile();
        if (clean.authUserId === userId) setProfile(clean);
        return;
      }
      // Soft social hydrate after identity is correct (never blocks avatar correctness)
      void hydrateSignalsFromLinkedAccounts().catch(() => undefined);
      setProfile(data);
      loadedForUser.current = userId;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Reload profile whenever the signed-in user changes (login / logout / switch)
  useEffect(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    // Always clear in-memory profile on user change so header never shows previous avatar
    setProfile(null);
    setLoading(true);
    void refresh();
  }, [userId, refresh]);

  const persist = useCallback(async (next: UserProfile) => {
    // Never write if the in-memory profile is for a different user
    if (userId && next.authUserId && next.authUserId !== userId) {
      console.warn('[useProfile] blocked save: profile authUserId mismatch');
      return;
    }
    const tagged = { ...next, authUserId: userId };
    setProfile(tagged);
    setSaving(true);
    try {
      await saveUserProfile(tagged);
    } finally {
      setSaving(false);
    }
  }, [userId]);

  const updateField = useCallback(
    <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
      setProfile((prev) => {
        if (!prev) return prev;
        if (userId && prev.authUserId && prev.authUserId !== userId) return prev;
        const next = { ...prev, [key]: value, authUserId: userId };
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          saveUserProfile(next).catch(console.warn);
        }, 800);
        return next;
      });
    },
    [userId],
  );

  const saveNow = useCallback(async () => {
    if (!profile) return;
    await persist(profile);
  }, [profile, persist]);

  const setAvatar = useCallback(
    async (file: File) => {
      const url = await uploadAvatar(file);
      if (!profile) return;
      // Don't attach avatar to a stale profile from another session
      if (userId && profile.authUserId && profile.authUserId !== userId) {
        await refresh();
        return;
      }
      await persist({ ...profile, avatarUrl: url, authUserId: userId });
    },
    [profile, persist, userId, refresh],
  );

  const addInterest = useCallback(
    async (interest: string, source: InterestSource = 'manual') => {
      if (!profile || !interest.trim()) return;
      const next = addInterestToProfile(profile, interest.trim(), source);
      await persist(next);
    },
    [profile, persist],
  );

  const removeInterest = useCallback(
    async (interest: string) => {
      if (!profile) return;
      const interests = profile.interests.filter((i) => i !== interest);
      const interestSources = { ...profile.interestSources };
      delete interestSources[interest];
      await persist({ ...profile, interests, interestSources });
    },
    [profile, persist],
  );

  const addDreamGoal = useCallback(
    async (goal: string) => {
      if (!profile || !goal.trim()) return;
      const trimmed = goal.trim();
      if (profile.dreamGoals.includes(trimmed)) return;
      const dreamGoals = [...profile.dreamGoals, trimmed];
      const onboardingGoalIds = goalIdsFromLabels(dreamGoals);
      await persist({ ...profile, dreamGoals, onboardingGoalIds });
    },
    [profile, persist],
  );

  const removeDreamGoal = useCallback(
    async (goal: string) => {
      if (!profile) return;
      const dreamGoals = profile.dreamGoals.filter((g) => g !== goal);
      const onboardingGoalIds = goalIdsFromLabels(dreamGoals);
      await persist({ ...profile, dreamGoals, onboardingGoalIds });
    },
    [profile, persist],
  );

  /** Link Spotify/Meta and pull tastes onto the profile (Tinder-style). */
  const connectSocialAndImport = useCallback(
    async (provider: SocialInterestSource) => {
      if (!profile) return [];
      const signals = linkSocialProviderForProfile(provider);
      let next = profile;
      for (const s of signals) {
        next = addInterestToProfile(next, s.label, s.source);
      }
      await persist(next);
      return signals;
    },
    [profile, persist],
  );

  const disconnectSocial = useCallback(
    async (provider: SocialInterestSource) => {
      if (!profile) return;
      unlinkSocialProviderSignals(provider);
      const interests = profile.interests.filter(
        (i) => profile.interestSources[i] !== provider,
      );
      const interestSources = { ...profile.interestSources };
      for (const key of Object.keys(interestSources)) {
        if (interestSources[key] === provider) delete interestSources[key];
      }
      await persist({ ...profile, interests, interestSources });
    },
    [profile, persist],
  );

  return {
    profile,
    loading,
    saving,
    refresh,
    updateField,
    saveNow,
    setAvatar,
    addInterest,
    removeInterest,
    addDreamGoal,
    removeDreamGoal,
    connectSocialAndImport,
    disconnectSocial,
  };
}
