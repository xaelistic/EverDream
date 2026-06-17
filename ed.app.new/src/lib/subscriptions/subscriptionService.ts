/**
 * Unified subscription service — RevenueCat (native) + Stripe (web).
 */

import { Capacitor } from '@capacitor/core';
import {
  cacheSubscription,
  fetchSubscriptionFromProfile,
  loadCachedSubscription,
} from './subscriptionStore';
import {
  configureRevenueCat,
  getRevenueCatOfferings,
  getRevenueCatSubscriptionState,
  isRevenueCatConfigured,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from './revenuecat';
import { isStripeConfigured, startStripeCheckout, openStripeCustomerPortal } from './stripe';
import type { SubscriptionOffering, SubscriptionState } from './types';
import { PRODUCT_IDS } from './types';

export { PRODUCT_IDS };
export type { SubscriptionState, SubscriptionOffering };
export { getLimitsForTier, tierAtLeast } from './entitlements';

export function getPreferredPaymentChannel(): 'revenuecat' | 'stripe' | 'none' {
  if (Capacitor.isNativePlatform() && isRevenueCatConfigured()) return 'revenuecat';
  if (!Capacitor.isNativePlatform() && isStripeConfigured()) return 'stripe';
  if (isStripeConfigured()) return 'stripe';
  if (isRevenueCatConfigured()) return 'revenuecat';
  return 'none';
}

export async function initSubscriptions(authUserId: string | null): Promise<SubscriptionState> {
  let state = loadCachedSubscription();

  if (authUserId && isRevenueCatConfigured()) {
    await configureRevenueCat(authUserId);
    const rcState = await getRevenueCatSubscriptionState();
    if (rcState) {
      state = rcState;
      cacheSubscription(state);
    }
  }

  if (authUserId) {
    try {
      state = await fetchSubscriptionFromProfile();
    } catch {
      /* use cached/rc */
    }
  }

  return state;
}

export async function refreshSubscription(): Promise<SubscriptionState> {
  if (isRevenueCatConfigured()) {
    const rc = await getRevenueCatSubscriptionState();
    if (rc) {
      cacheSubscription(rc);
    }
  }
  return fetchSubscriptionFromProfile();
}

export async function getOfferings(): Promise<SubscriptionOffering[]> {
  if (Capacitor.isNativePlatform() && isRevenueCatConfigured()) {
    return getRevenueCatOfferings();
  }

  return [
    {
      tier: 'plus',
      identifier: PRODUCT_IDS.plusMonthly,
      title: 'EverDream+',
      priceString: '$4.99/mo',
    },
    {
      tier: 'pro',
      identifier: PRODUCT_IDS.proMonthly,
      title: 'EverDream Pro',
      priceString: '$9.99/mo',
    },
  ];
}

export async function purchaseTier(tier: 'plus' | 'pro', packageIdentifier?: string): Promise<SubscriptionState> {
  const channel = getPreferredPaymentChannel();

  if (channel === 'revenuecat') {
    const offerings = await getRevenueCatOfferings();
    const match =
      offerings.find((o) => o.tier === tier) ||
      offerings.find((o) => packageIdentifier && o.packageIdentifier === packageIdentifier);
    const pkgId = packageIdentifier || match?.packageIdentifier || match?.identifier;
    if (!pkgId) throw new Error(`No RevenueCat package for ${tier}`);

    const state = await purchaseRevenueCatPackage(pkgId);
    if (!state) throw new Error('Purchase failed');
    cacheSubscription(state);
    return state;
  }

  if (channel === 'stripe') {
    await startStripeCheckout(tier);
    return loadCachedSubscription();
  }

  throw new Error(
    'Subscriptions not configured. Set RevenueCat keys (mobile) or Stripe keys (web).',
  );
}

export async function restorePurchases(): Promise<SubscriptionState> {
  if (!isRevenueCatConfigured()) {
    return refreshSubscription();
  }
  const state = await restoreRevenueCatPurchases();
  if (state) cacheSubscription(state);
  return state ?? refreshSubscription();
}

export async function manageSubscription(): Promise<void> {
  const channel = getPreferredPaymentChannel();
  if (channel === 'stripe') {
    await openStripeCustomerPortal();
    return;
  }
  if (channel === 'revenuecat') {
    await restorePurchases();
    return;
  }
  throw new Error('No subscription manager available');
}

export function isSubscriptionsEnabled(): boolean {
  return getPreferredPaymentChannel() !== 'none';
}