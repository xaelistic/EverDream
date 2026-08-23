import { supabase } from '../supabase/client';

export type CreditBalance = {
  monthlyAllotment: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  purchasedCredits: number;
  totalRemaining: number;
  allotmentMonth: string;
  tier: string;
  source: 'db' | 'local';
};

export const FREE_STARTER_CREDITS = 14;
const LOCAL_KEY = 'everdream_starter_credits_used';
const LEGACY_MONTHLY_KEY = 'everdream_image_usage';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** One-time starter pack — never refills on a calendar month. */
export function starterRemainingFromUsed(used: number, starter = FREE_STARTER_CREDITS): number {
  return Math.max(0, starter - Math.max(0, used));
}

function readLocalUsed(): number {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw != null && raw !== '') {
      const n = Number(raw);
      if (Number.isFinite(n)) return Math.max(0, n);
    }
    const legacy = localStorage.getItem(LEGACY_MONTHLY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { imageCount?: number };
      return Math.max(0, Number(parsed.imageCount) || 0);
    }
  } catch {
    /* ignore */
  }
  return 0;
}

function saveLocalUsed(used: number) {
  localStorage.setItem(LOCAL_KEY, String(Math.max(0, used)));
}

function localBalance(): CreditBalance {
  const remaining = starterRemainingFromUsed(readLocalUsed());
  return {
    monthlyAllotment: 0,
    monthlyUsed: 0,
    monthlyRemaining: 0,
    purchasedCredits: remaining,
    totalRemaining: remaining,
    allotmentMonth: currentMonth(),
    tier: 'free',
    source: 'local',
  };
}

export async function getCreditBalance(): Promise<CreditBalance> {
  try {
    const { data, error } = await supabase.rpc('get_credit_balance');
    if (error || !data) return localBalance();
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return localBalance();
    return {
      monthlyAllotment: Number(row.monthly_allotment) || 0,
      monthlyUsed: Number(row.monthly_used) || 0,
      monthlyRemaining: Number(row.monthly_remaining) || 0,
      purchasedCredits: Number(row.purchased_credits) || 0,
      totalRemaining: Number(row.total_remaining) || 0,
      allotmentMonth: String(row.allotment_month || currentMonth()),
      tier: String(row.tier || 'free'),
      source: 'db',
    };
  } catch {
    return localBalance();
  }
}

export async function consumeImageCredits(
  amount: number,
  reason = 'image_generation',
): Promise<{ ok: boolean; remaining: number; message: string }> {
  try {
    const { data, error } = await supabase.rpc('consume_image_credits', { amount, reason });
    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data;
      return {
        ok: Boolean(row?.ok),
        remaining: Number(row?.total_remaining) || 0,
        message: String(row?.message || ''),
      };
    }
  } catch {
    /* fall through to local */
  }
  const used = readLocalUsed();
  const remaining = starterRemainingFromUsed(used);
  if (remaining < amount) {
    return { ok: false, remaining, message: 'Not enough credits' };
  }
  saveLocalUsed(used + amount);
  return { ok: true, remaining: remaining - amount, message: 'local' };
}

export async function refundImageCredits(amount: number, reason = 'refund'): Promise<void> {
  try {
    await supabase.rpc('refund_image_credits', { amount, reason });
  } catch {
    saveLocalUsed(Math.max(0, readLocalUsed() - amount));
  }
}

export const CREDIT_PACKS = [
  { id: 'pack_20', credits: 20, price: '$4.99', blurb: 'A few extra nights of images' },
  { id: 'pack_60', credits: 60, price: '$11.99', blurb: 'Best for weekly dreamers' },
  { id: 'pack_150', credits: 150, price: '$24.99', blurb: 'Storyboards and video stills' },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]['id'];
