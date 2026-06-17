import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadUserProfile,
  saveUserProfile,
  uploadAvatar,
  type UserProfile,
} from '../lib/profileService';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
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
    async (interest: string) => {
      if (!profile || !interest.trim()) return;
      const trimmed = interest.trim();
      if (profile.interests.includes(trimmed)) return;
      await persist({ ...profile, interests: [...profile.interests, trimmed] });
    },
    [profile, persist],
  );

  const addDreamGoal = useCallback(
    async (goal: string) => {
      if (!profile || !goal.trim()) return;
      const trimmed = goal.trim();
      if (profile.dreamGoals.includes(trimmed)) return;
      await persist({ ...profile, dreamGoals: [...profile.dreamGoals, trimmed] });
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
    addDreamGoal,
  };
}