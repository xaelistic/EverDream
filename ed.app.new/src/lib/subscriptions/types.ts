export type SubscriptionTier = 'free' | 'plus' | 'pro';

export type SubscriptionSource = 'apple' | 'google' | 'stripe' | 'revenuecat' | 'manual' | null;

export interface SubscriptionState {
  tier: SubscriptionTier;
  source: SubscriptionSource;
  expiresAt: string | null;
  isActive: boolean;
  /** True when paid tier is active or not yet expired */
  hasPlus: boolean;
  hasPro: boolean;
}

export interface SubscriptionOffering {
  tier: 'plus' | 'pro';
  identifier: string;
  title: string;
  priceString: string;
  packageIdentifier?: string;
}

export const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  plus: 1,
  pro: 2,
};

export const PRODUCT_IDS = {
  plusMonthly: 'everdream_plus_monthly',
  proMonthly: 'everdream_pro_monthly',
} as const;

export const REVENUECAT_ENTITLEMENTS = {
  plus: 'plus',
  pro: 'pro',
} as const;