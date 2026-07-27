import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadUserProfile,
  saveUserProfile,
  uploadAvatar,
  addInterestToProfile,
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

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Hydrate signal cache from linked accounts (does not force-write interests)
      await hydrateSignalsFromLinkedAccounts();
      const data = await loadUserProfile();
      setProfile(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = useCallback(async (next: UserProfile) => {
    setProfile(next);
    setSaving(true);
    try {
      await saveUserProfile(next);
    } finally {
      setSaving(false);
    }
  }, []);

  const updateField = useCallback(
    <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
      setProfile((prev) => {
        if (!prev) return prev;
        const next = { ...prev, [key]: value };
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          saveUserProfile(next).catch(console.warn);
        }, 800);
        return next;
      });
    },
    [],
  );

  const saveNow = useCallback(async () => {
    if (!profile) return;
    await persist(profile);
  }, [profile, persist]);

  const setAvatar = useCallback(
    async (file: File) => {
      const url = await uploadAvatar(file);
      if (!profile) return;
      await persist({ ...profile, avatarUrl: url });
    },
    [profile, persist],
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