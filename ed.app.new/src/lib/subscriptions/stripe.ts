/**
 * Stripe Checkout — web subscriptions via Supabase Edge Function.
 */

import { supabase } from '../supabase/client';
import { getProfileId } from './subscriptionStore';
import type { SubscriptionTier } from './types';

export function isStripeConfigured(): boolean {
  return Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
}

export async function startStripeCheckout(tier: 'plus' | 'pro'): Promise<void> {
  const profileId = await getProfileId();
  if (!profileId) {
    throw new Error('Sign in required before subscribing');
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://everdream.app';
  const successUrl = `${origin}/#/settings?subscription=success&tier=${tier}`;
  const cancelUrl = `${origin}/#/settings?subscription=cancelled`;

  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: {
      tier,
      profile_id: profileId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
  });

  if (error) throw new Error(error.message || 'Checkout failed');
  if (!data?.url) throw new Error('No checkout URL returned');

  window.location.href = data.url as string;
}

export async function openStripeCustomerPortal(): Promise<void> {
  const profileId = await getProfileId();
  if (!profileId) throw new Error('Sign in required');

  const returnUrl = `${window.location.origin}/#/settings`;

  const { data, error } = await supabase.functions.invoke('stripe-portal', {
    body: { profile_id: profileId, return_url: returnUrl },
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

  if (sub === 'success') return { status: 'success', tier };
  if (sub === 'cancelled') return { status: 'cancelled', tier: null };
  return { status: null, tier: null };
}

export function clearSubscriptionReturnParams(): void {
  if (typeof window === 'undefined') return;
  const base = window.location.hash.split('?')[0] || '#/settings';
  window.history.replaceState(null, '', `${window.location.pathname}${base}`);
}