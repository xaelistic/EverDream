import type { SubscriptionTier, SubscriptionState } from './types';
import { TIER_RANK } from './types';

export const TIER_LIMITS = {
  free: {
    aiImagesPerMonth: 5,
    cloudSync: false,
    wearables: false,
    vrSimulacra: false,
    advancedAnalytics: false,
    exportPdf: false,
  },
  plus: {
    aiImagesPerMonth: Infinity,
    cloudSync: true,
    wearables: true,
    vrSimulacra: false,
    advancedAnalytics: true,
    exportPdf: true,
  },
  pro: {
    aiImagesPerMonth: Infinity,
    cloudSync: true,
    wearables: true,
    vrSimulacra: true,
    advancedAnalytics: true,
    exportPdf: true,
  },
} as const;

export function tierAtLeast(current: SubscriptionTier, required: SubscriptionTier): boolean {
  return TIER_RANK[current] >= TIER_RANK[required];
}

export function buildSubscriptionState(
  tier: SubscriptionTier,
  source: SubscriptionState['source'] = null,
  expiresAt: string | null = null,
): SubscriptionState {
  const isActive =
    tier === 'free' ||
    !expiresAt ||
    new Date(expiresAt).getTime() > Date.now();

  const effectiveTier = isActive ? tier : 'free';

  return {
    tier: effectiveTier,
    source,
    expiresAt,
    isActive,
    hasPlus: tierAtLeast(effectiveTier, 'plus'),
    hasPro: tierAtLeast(effectiveTier, 'pro'),
  };
}

export function getLimitsForTier(tier: SubscriptionTier) {
  return TIER_LIMITS[tier];
}