/**
 * Monthly usage counters for free-tier limits.
 */

import { getLimitsForTier } from './entitlements';
import type { SubscriptionTier } from './types';

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
  const remaining = Math.max(0, limit - used);
  return { allowed: remaining > 0, remaining, limit };
}

export function recordImageGeneration(): void {
  const usage = loadUsage();
  usage.imageCount += 1;
  saveUsage(usage);
}