/**
 * Supabase + localStorage subscription state.
 */

import { supabase, getCurrentUser } from '../supabase/client';
import { buildSubscriptionState } from './entitlements';
import type { SubscriptionState, SubscriptionTier, SubscriptionSource } from './types';

const CACHE_KEY = 'everdream_subscription';

export interface ProfileSubscriptionRow {
  subscription_tier: SubscriptionTier;
  subscription_source: SubscriptionSource;
  subscription_expires_at: string | null;
}

export function cacheSubscription(state: SubscriptionState): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function loadCachedSubscription(): SubscriptionState {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SubscriptionState;
      return buildSubscriptionState(parsed.tier, parsed.source, parsed.expiresAt);
    }
  } catch {
    /* ignore */
  }
  return buildSubscriptionState('free');
}

export async function fetchSubscriptionFromProfile(): Promise<SubscriptionState> {
  const user = await getCurrentUser();
  if (!user) return loadCachedSubscription();

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_source, subscription_expires_at')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return loadCachedSubscription();

  const state = buildSubscriptionState(
    (profile.subscription_tier as SubscriptionTier) || 'free',
    profile.subscription_source as SubscriptionSource,
    profile.subscription_expires_at,
  );
  cacheSubscription(state);
  return state;
}

export async function getProfileId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single();
  return data?.id ?? null;
}