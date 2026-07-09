/**
 * Subscription tiers and feature access for EverDream.
 * Admins always receive full access regardless of tier.
 */

export type SubscriptionTier = 'free' | 'plus' | 'pro';

export type FeatureFlag =
  | 'ai_analysis_basic'
  | 'ai_analysis_advanced'
  | 'image_generation'
  | 'image_generation_unlimited'
  | 'cloud_sync'
  | 'wearable_integration'
  | 'export_json_pdf'
  | 'lucid_tools'
  | 'vr_visualization'
  | 'api_access'
  | 'admin_dashboard'
  | 'priority_support';

const TIER_FEATURES: Record<SubscriptionTier, Set<FeatureFlag>> = {
  free: new Set([
    'ai_analysis_basic',
    'image_generation',
  ]),
  plus: new Set([
    'ai_analysis_basic',
    'ai_analysis_advanced',
    'image_generation',
    'image_generation_unlimited',
    'cloud_sync',
    'wearable_integration',
    'export_json_pdf',
    'priority_support',
  ]),
  pro: new Set([
    'ai_analysis_basic',
    'ai_analysis_advanced',
    'image_generation',
    'image_generation_unlimited',
    'cloud_sync',
    'wearable_integration',
    'export_json_pdf',
    'lucid_tools',
    'vr_visualization',
    'api_access',
    'priority_support',
  ]),
};

const ALL_FEATURES = new Set<FeatureFlag>([
  'ai_analysis_basic',
  'ai_analysis_advanced',
  'image_generation',
  'image_generation_unlimited',
  'cloud_sync',
  'wearable_integration',
  'export_json_pdf',
  'lucid_tools',
  'vr_visualization',
  'api_access',
  'admin_dashboard',
  'priority_support',
]);

export function normalizeTier(tier?: string | null): SubscriptionTier {
  if (tier === 'plus' || tier === 'pro') return tier;
  return 'free';
}

export function hasFeature(
  tier: SubscriptionTier,
  feature: FeatureFlag,
  isAdmin = false,
): boolean {
  if (isAdmin) return ALL_FEATURES.has(feature);
  return TIER_FEATURES[tier].has(feature);
}

export function getTierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case 'plus':
      return 'EverDream+';
    case 'pro':
      return 'EverDream Pro';
    default:
      return 'Free';
  }
}

export function getImageGenerationLimit(tier: SubscriptionTier, isAdmin = false): number | null {
  if (isAdmin || tier === 'plus' || tier === 'pro') return null;
  return 5;
}

export function bypassesRateLimits(tier: SubscriptionTier, isAdmin = false): boolean {
  return isAdmin || tier === 'pro';
}