/**
 * useSubscription — reads tier + admin status from the user's profile.
 */

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { useAuth } from './use-auth';
import { getMyProfile, type ProfileRecord } from '../lib/supabase/profiles';
import {
  hasFeature,
  normalizeTier,
  getTierLabel,
  bypassesRateLimits,
  getImageGenerationLimit,
  type FeatureFlag,
  type SubscriptionTier,
} from '../lib/subscription';

export interface SubscriptionState {
  tier: SubscriptionTier;
  tierLabel: string;
  isAdmin: boolean;
  profile: ProfileRecord | null;
  loading: boolean;
  hasFeature: (feature: FeatureFlag) => boolean;
  bypassesRateLimits: boolean;
  imageGenerationLimit: number | null;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const value = useSubscriptionInternal();
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionState {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within a <SubscriptionProvider>');
  }
  return ctx;
}

function useSubscriptionInternal(): SubscriptionState {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || user.isAnonymous) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch (err) {
      console.warn('[useSubscription] Failed to load profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tier = normalizeTier(profile?.subscription_tier);
  const isAdmin = profile?.is_admin === true;

  return {
    tier,
    tierLabel: getTierLabel(tier),
    isAdmin,
    profile,
    loading,
    hasFeature: (feature: FeatureFlag) => hasFeature(tier, feature, isAdmin),
    bypassesRateLimits: bypassesRateLimits(tier, isAdmin),
    imageGenerationLimit: getImageGenerationLimit(tier, isAdmin),
    refresh,
  };
}