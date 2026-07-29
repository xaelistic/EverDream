/**
 * Referral incentives for viral growth.
 *
 * Rewards (client-side ledger until backend claims API exists):
 * - Per successful signup: free generation tokens for referrer (and welcome tokens for referee)
 * - Per paid subscription by referee: free month credit for both parties
 */

const REFERRAL_CODE_KEY = 'everdream_referral_code';
const REFERRAL_STATS_KEY = 'everdream_referral_stats';
const GENERATION_TOKENS_KEY = 'everdream_generation_tokens';
const FREE_MONTH_CREDITS_KEY = 'everdream_free_month_credits';
const APPLIED_REFERRAL_KEY = 'everdream_applied_referral';

/** Tokens granted to referrer when someone signs up with their code */
export const TOKENS_PER_SIGNUP = 5;
/** Welcome tokens for the person who used a referral code */
export const TOKENS_WELCOME_REFEREE = 3;
/** Free months granted when a referred user pays for a subscription */
export const FREE_MONTHS_ON_SUBSCRIBE = 1;

export interface ReferralStats {
  code: string;
  signups: number;
  paidConversions: number;
  tokensEarned: number;
  freeMonthsEarned: number;
  history: ReferralEvent[];
}

export interface ReferralEvent {
  type: 'signup' | 'subscribe';
  at: string;
  /** Opaque label e.g. "friend" or last4 of code used */
  label?: string;
}

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'ED';
  for (let i = 0; i < 6; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

export function getOrCreateReferralCode(): string {
  try {
    const existing = localStorage.getItem(REFERRAL_CODE_KEY);
    if (existing && existing.length >= 4) return existing;
    const code = randomCode();
    localStorage.setItem(REFERRAL_CODE_KEY, code);
    return code;
  } catch {
    return 'EDGUEST';
  }
}

export function getReferralStats(): ReferralStats {
  const code = getOrCreateReferralCode();
  try {
    const raw = localStorage.getItem(REFERRAL_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ReferralStats;
      return { ...parsed, code: parsed.code || code };
    }
  } catch {
    /* ignore */
  }
  return {
    code,
    signups: 0,
    paidConversions: 0,
    tokensEarned: 0,
    freeMonthsEarned: 0,
    history: [],
  };
}

function saveReferralStats(stats: ReferralStats): void {
  localStorage.setItem(REFERRAL_STATS_KEY, JSON.stringify(stats));
}

export function getGenerationTokenBalance(): number {
  try {
    const n = parseInt(localStorage.getItem(GENERATION_TOKENS_KEY) || '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function addGenerationTokens(amount: number): number {
  const next = getGenerationTokenBalance() + Math.max(0, amount);
  localStorage.setItem(GENERATION_TOKENS_KEY, String(next));
  return next;
}

/** Consume one generation token if available. Returns true if consumed. */
export function consumeGenerationToken(): boolean {
  const bal = getGenerationTokenBalance();
  if (bal <= 0) return false;
  localStorage.setItem(GENERATION_TOKENS_KEY, String(bal - 1));
  return true;
}

export function getFreeMonthCredits(): number {
  try {
    const n = parseInt(localStorage.getItem(FREE_MONTH_CREDITS_KEY) || '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function addFreeMonthCredits(amount: number): number {
  const next = getFreeMonthCredits() + Math.max(0, amount);
  localStorage.setItem(FREE_MONTH_CREDITS_KEY, String(next));
  return next;
}

export function buildReferralLink(code?: string): string {
  const c = code || getOrCreateReferralCode();
  if (typeof window === 'undefined') return `https://everdream.app/?ref=${c}`;
  const origin = window.location.origin;
  // Landing + app deep-link
  return `${origin}${window.location.pathname}?ref=${encodeURIComponent(c)}#/`;
}

/**
 * Apply a referral code for this device/user (once).
 * Grants welcome tokens to the referee. Call after sign-up.
 */
export function applyReferralCode(code: string): { ok: boolean; message: string; tokens?: number } {
  const normalized = code.trim().toUpperCase();
  if (!normalized || normalized.length < 4) {
    return { ok: false, message: 'Enter a valid referral code.' };
  }

  const mine = getOrCreateReferralCode();
  if (normalized === mine) {
    return { ok: false, message: 'You can’t use your own referral code.' };
  }

  try {
    if (localStorage.getItem(APPLIED_REFERRAL_KEY)) {
      return { ok: false, message: 'A referral code was already applied on this device.' };
    }
    localStorage.setItem(APPLIED_REFERRAL_KEY, normalized);
    addGenerationTokens(TOKENS_WELCOME_REFEREE);
    return {
      ok: true,
      message: `Welcome! +${TOKENS_WELCOME_REFEREE} free generation tokens.`,
      tokens: TOKENS_WELCOME_REFEREE,
    };
  } catch {
    return { ok: false, message: 'Could not apply referral code.' };
  }
}

/**
 * Record a successful referral signup for the current user (as referrer).
 * In production this is driven by backend webhook; client helper for demo/QA.
 */
export function recordReferralSignup(label?: string): ReferralStats {
  const stats = getReferralStats();
  stats.signups += 1;
  stats.tokensEarned += TOKENS_PER_SIGNUP;
  const event: ReferralEvent = {
    type: 'signup',
    at: new Date().toISOString(),
    label,
  };
  stats.history = [event, ...stats.history].slice(0, 50);
  saveReferralStats(stats);
  addGenerationTokens(TOKENS_PER_SIGNUP);
  return stats;
}

/**
 * Record that a referred user subscribed — grants free month credits.
 */
export function recordReferralSubscribe(label?: string): ReferralStats {
  const stats = getReferralStats();
  stats.paidConversions += 1;
  stats.freeMonthsEarned += FREE_MONTHS_ON_SUBSCRIBE;
  const event: ReferralEvent = {
    type: 'subscribe',
    at: new Date().toISOString(),
    label,
  };
  stats.history = [event, ...stats.history].slice(0, 50);
  saveReferralStats(stats);
  addFreeMonthCredits(FREE_MONTHS_ON_SUBSCRIBE);
  return stats;
}

export function getAppliedReferralCode(): string | null {
  try {
    return localStorage.getItem(APPLIED_REFERRAL_KEY);
  } catch {
    return null;
  }
}

/** Capture ?ref= from URL into session for post-auth apply. */
export function captureReferralFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral');
    if (ref) {
      sessionStorage.setItem('everdream_pending_ref', ref.trim().toUpperCase());
      return ref.trim().toUpperCase();
    }
    return sessionStorage.getItem('everdream_pending_ref');
  } catch {
    return null;
  }
}

export function consumePendingReferral(): string | null {
  try {
    const pending = sessionStorage.getItem('everdream_pending_ref');
    if (pending) sessionStorage.removeItem('everdream_pending_ref');
    return pending;
  } catch {
    return null;
  }
}
