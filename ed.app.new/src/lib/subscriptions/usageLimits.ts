/**
 * Monthly usage counters for free-tier limits.
 * Referral bonus tokens (lib/referral) extend free-tier generation capacity.
 */

import { getLimitsForTier } from './entitlements';
import type { SubscriptionTier } from './types';
import { consumeGenerationToken, getGenerationTokenBalance } from '../referral';

const USAGE_KEY = 'everdream_image_usage';

interface MonthlyUsage {
  month: string;
  imageCount: number;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function loadUsage(): MonthlyUsage {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MonthlyUsage;
      if (parsed.month === currentMonth()) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { month: currentMonth(), imageCount: 0 };
}

function saveUsage(usage: MonthlyUsage): void {
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

export function getImageUsageThisMonth(): number {
  return loadUsage().imageCount;
}

export function canGenerateImage(tier: SubscriptionTier): { allowed: boolean; remaining: number; limit: number } {
  const limit = getLimitsForTier(tier).aiImagesPerMonth;
  if (!Number.isFinite(limit)) {
    return { allowed: true, remaining: Infinity, limit };
  }
  const used = getImageUsageThisMonth();
  const planRemaining = Math.max(0, limit - used);
  const bonusTokens = getGenerationTokenBalance();
  const remaining = planRemaining + bonusTokens;
  return { allowed: remaining > 0, remaining, limit: limit + bonusTokens };
}

export function recordImageGeneration(): void {
  const usage = loadUsage();
  const limit = getLimitsForTier('free').aiImagesPerMonth;
  // Prefer plan quota first; only spend referral tokens once plan is exhausted
  if (Number.isFinite(limit) && usage.imageCount >= limit) {
    consumeGenerationToken();
  }
  usage.imageCount += 1;
  saveUsage(usage);
}