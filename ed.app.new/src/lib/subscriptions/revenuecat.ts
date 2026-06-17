/**
 * RevenueCat — Google Play + App Store subscriptions (Capacitor native).
 */

import { Capacitor } from '@capacitor/core';
import { buildSubscriptionState } from './entitlements';
import type { SubscriptionOffering, SubscriptionState, SubscriptionTier } from './types';
import { REVENUECAT_ENTITLEMENTS } from './types';

const IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_API_KEY as string | undefined;
const ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY as string | undefined;

type PurchasesModule = typeof import('@revenuecat/purchases-capacitor');

let purchasesModule: PurchasesModule | null = null;
let configuredForUser: string | null = null;

export function isRevenueCatConfigured(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return Boolean(IOS_KEY);
  if (platform === 'android') return Boolean(ANDROID_KEY);
  return false;
}

function getApiKey(): string | null {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return IOS_KEY ?? null;
  if (platform === 'android') return ANDROID_KEY ?? null;
  return null;
}

async function getPurchases(): Promise<PurchasesModule['Purchases'] | null> {
  if (!isRevenueCatConfigured()) return null;
  if (!purchasesModule) {
    purchasesModule = await import('@revenuecat/purchases-capacitor');
  }
  return purchasesModule.Purchases;
}

export async function configureRevenueCat(appUserId: string): Promise<void> {
  const apiKey = getApiKey();
  const Purchases = await getPurchases();
  if (!apiKey || !Purchases) return;

  if (configuredForUser === appUserId) return;

  try {
    const { LOG_LEVEL } = purchasesModule!;
    await Purchases.setLogLevel({ level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO });
  } catch {
    /* log level optional */
  }
  await Purchases.configure({ apiKey, appUserID: appUserId });
  configuredForUser = appUserId;
}

function tierFromCustomerInfo(info: {
  entitlements: { active: Record<string, { expirationDate?: string | null }> };
}): { tier: SubscriptionTier; expiresAt: string | null } {
  const active = info.entitlements.active;
  if (active[REVENUECAT_ENTITLEMENTS.pro]) {
    return {
      tier: 'pro',
      expiresAt: active[REVENUECAT_ENTITLEMENTS.pro].expirationDate ?? null,
    };
  }
  if (active[REVENUECAT_ENTITLEMENTS.plus]) {
    return {
      tier: 'plus',
      expiresAt: active[REVENUECAT_ENTITLEMENTS.plus].expirationDate ?? null,
    };
  }
  return { tier: 'free', expiresAt: null };
}

export async function getRevenueCatSubscriptionState(): Promise<SubscriptionState | null> {
  const Purchases = await getPurchases();
  if (!Purchases) return null;

  const { customerInfo } = await Purchases.getCustomerInfo();
  const { tier, expiresAt } = tierFromCustomerInfo(customerInfo);
  const source = Capacitor.getPlatform() === 'ios' ? 'apple' : 'google';
  return buildSubscriptionState(tier, source, expiresAt);
}

export async function getRevenueCatOfferings(): Promise<SubscriptionOffering[]> {
  const Purchases = await getPurchases();
  if (!Purchases) return [];

  const { offerings } = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];

  const result: SubscriptionOffering[] = [];

  for (const pkg of current.availablePackages) {
    const id = pkg.identifier.toLowerCase();
    let tier: 'plus' | 'pro' | null = null;
    if (id.includes('pro')) tier = 'pro';
    else if (id.includes('plus')) tier = 'plus';

    if (!tier) continue;

    result.push({
      tier,
      identifier: pkg.identifier,
      title: pkg.product.title,
      priceString: pkg.product.priceString,
      packageIdentifier: pkg.identifier,
    });
  }

  return result;
}

export async function purchaseRevenueCatPackage(packageIdentifier: string): Promise<SubscriptionState | null> {
  const Purchases = await getPurchases();
  if (!Purchases) throw new Error('RevenueCat not available on this platform');

  const { offerings } = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages.find((p) => p.identifier === packageIdentifier);
  if (!pkg) throw new Error('Package not found');

  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  const { tier, expiresAt } = tierFromCustomerInfo(customerInfo);
  const source = Capacitor.getPlatform() === 'ios' ? 'apple' : 'google';
  return buildSubscriptionState(tier, source, expiresAt);
}

export async function restoreRevenueCatPurchases(): Promise<SubscriptionState | null> {
  const Purchases = await getPurchases();
  if (!Purchases) throw new Error('RevenueCat not available');

  const { customerInfo } = await Purchases.restorePurchases();
  const { tier, expiresAt } = tierFromCustomerInfo(customerInfo);
  const source = Capacitor.getPlatform() === 'ios' ? 'apple' : 'google';
  return buildSubscriptionState(tier, source, expiresAt);
}