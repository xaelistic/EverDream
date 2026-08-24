/**
 * Stripe Checkout — web subscriptions via Supabase Edge Function.
 */

import { supabase } from '../supabase/client';
import type { SubscriptionTier } from './types';

export function isStripeConfigured(): boolean {
  // Redirect Checkout uses the stripe-checkout edge function (secret on the server).
  // A publishable key is only required for Stripe.js Elements, which we do not use.
  return import.meta.env.VITE_STRIPE_DISABLED !== 'true';
}

const CHECKOUT_INTENT_KEY = 'ed_checkout_intent';

export type CheckoutIntent = { plan?: 'plus' | 'pro'; pack?: string };

function parseHashIntent(): CheckoutIntent {
  if (typeof window === 'undefined') return {};
  const hash = window.location.hash || '';
  const qIndex = hash.indexOf('?');
  if (qIndex < 0) return {};
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  const planRaw = params.get('plan');
  const pack = params.get('pack') || undefined;
  const plan = planRaw === 'plus' || planRaw === 'pro' ? planRaw : undefined;
  return { plan, pack };
}

function stripCheckoutParamsFromHash(): void {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash || '';
  const qIndex = hash.indexOf('?');
  if (qIndex < 0) return;
  const path = hash.slice(0, qIndex);
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  if (!params.has('plan') && !params.has('pack')) return;
  params.delete('plan');
  params.delete('pack');
  const rest = params.toString();
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}${path}${rest ? `?${rest}` : ''}`,
  );
}

function writeStoredIntent(intent: CheckoutIntent): void {
  if (typeof window === 'undefined') return;
  try {
    if (!intent.plan && !intent.pack) {
      sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
      return;
    }
    sessionStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify(intent));
  } catch {
    /* private mode */
  }
}

export function readCheckoutIntent(): CheckoutIntent {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(CHECKOUT_INTENT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CheckoutIntent;
    const plan = parsed.plan === 'plus' || parsed.plan === 'pro' ? parsed.plan : undefined;
    const pack = typeof parsed.pack === 'string' && parsed.pack ? parsed.pack : undefined;
    return { plan, pack };
  } catch {
    return {};
  }
}

export function clearCheckoutIntent(): void {
  writeStoredIntent({});
}

/** Persist ?plan= / ?pack= so login or OAuth does not drop a website buy link. */
export function captureCheckoutIntent(): CheckoutIntent {
  const fromHash = parseHashIntent();
  if (fromHash.plan || fromHash.pack) {
    writeStoredIntent(fromHash);
    stripCheckoutParamsFromHash();
    return fromHash;
  }
  return readCheckoutIntent();
}

/** Capture hash intent if present and return the stored plan/pack. Does not clear storage. */
export function consumeCheckoutIntent(): CheckoutIntent {
  return captureCheckoutIntent();
}

export async function startStripeCheckout(tier: 'plus' | 'pro'): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://everdream.n1g3.com';
  const successUrl = `${origin}/#/billing?subscription=success&tier=${tier}`;
  const cancelUrl = `${origin}/#/billing?subscription=cancelled`;

  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: {
      kind: 'subscription',
      tier,
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
  });

  if (error) throw new Error(error.message || 'Checkout failed');
  if (!data?.url) throw new Error('No checkout URL returned');

  window.location.href = data.url as string;
}

export async function startStripeCreditCheckout(packId: string): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://everdream.n1g3.com';
  const successUrl = `${origin}/#/billing?credits=success&pack=${encodeURIComponent(packId)}`;
  const cancelUrl = `${origin}/#/billing?credits=cancelled`;

  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: {
      kind: 'credits',
      pack_id: packId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
  });

  if (error) throw new Error(error.message || 'Checkout failed');
  if (!data?.url) throw new Error('No checkout URL returned');
  window.location.href = data.url as string;
}

export async function openStripeCustomerPortal(): Promise<void> {
  const returnUrl = `${window.location.origin}/#/billing`;

  const { data, error } = await supabase.functions.invoke('stripe-portal', {
    body: { return_url: returnUrl },
  });

  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error('Portal unavailable');

  window.location.href = data.url as string;
}

/** Parse ?subscription=success from hash query after Stripe redirect. */
export function parseSubscriptionReturn(): { status: 'success' | 'cancelled' | null; tier: SubscriptionTier | null } {
  if (typeof window === 'undefined') return { status: null, tier: null };
  const hash = window.location.hash;
  const qIndex = hash.indexOf('?');
  if (qIndex < 0) return { status: null, tier: null };

  const params = new URLSearchParams(hash.slice(qIndex + 1));
  const sub = params.get('subscription');
  const tier = params.get('tier') as SubscriptionTier | null;

  if (sub === 'success' || params.get('credits') === 'success') return { status: 'success', tier };
  if (sub === 'cancelled' || params.get('credits') === 'cancelled') return { status: 'cancelled', tier: null };
  return { status: null, tier: null };
}

export function clearSubscriptionReturnParams(): void {
  if (typeof window === 'undefined') return;
  const base = window.location.hash.split('?')[0] || '#/settings';
  window.history.replaceState(null, '', `${window.location.pathname}${base}`);
}