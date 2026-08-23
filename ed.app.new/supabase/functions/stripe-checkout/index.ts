import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const ALLOWED_ORIGINS = [
  'https://everdream.n1g3.com',
  'https://everdream.app',
  'https://www.everdream.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

const CREDIT_PACKS: Record<string, { credits: number; env: string }> = {
  pack_20: { credits: 20, env: 'STRIPE_PRICE_CREDITS_20' },
  pack_60: { credits: 60, env: 'STRIPE_PRICE_CREDITS_60' },
  pack_150: { credits: 150, env: 'STRIPE_PRICE_CREDITS_150' },
};

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : 'https://everdream.n1g3.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function isAllowedReturnUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    return ALLOWED_ORIGINS.includes(parsed.origin);
  } catch {
    return false;
  }
}

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 503,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Sign in required' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Sign in required' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const body = await req.json();
    const kind = (body.kind as string) || 'subscription';
    const tier = body.tier as 'plus' | 'pro' | undefined;
    const packId = body.pack_id as string | undefined;
    const successUrl = body.success_url as string;
    const cancelUrl = body.cancel_url as string;

    if (!isAllowedReturnUrl(successUrl) || !isAllowedReturnUrl(cancelUrl)) {
      return new Response(JSON.stringify({ error: 'Invalid return URL' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: profile } = await admin
      .from('profiles')
      .select('id, auth_user_id, stripe_customer_id')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let customerId = profile.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: authData.user.email,
        metadata: { profile_id: profile.id, auth_user_id: profile.auth_user_id },
      });
      customerId = customer.id;
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', profile.id);
    }

    let session: Stripe.Checkout.Session;
    if (kind === 'credits') {
      const pack = packId ? CREDIT_PACKS[packId] : undefined;
      const priceId = pack ? Deno.env.get(pack.env) : '';
      if (!pack || !priceId) {
        return new Response(JSON.stringify({ error: 'Unknown credit pack' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          profile_id: profile.id,
          kind: 'credits',
          pack_id: packId!,
          credits: String(pack.credits),
        },
      });
    } else {
      if (tier !== 'plus' && tier !== 'pro') {
        return new Response(JSON.stringify({ error: 'Invalid plan' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      const priceId =
        tier === 'pro'
          ? Deno.env.get('STRIPE_PRICE_PRO_MONTHLY')
          : Deno.env.get('STRIPE_PRICE_PLUS_MONTHLY');
      if (!priceId) {
        return new Response(JSON.stringify({ error: 'Missing price' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { profile_id: profile.id, tier, kind: 'subscription' },
        subscription_data: {
          metadata: { profile_id: profile.id, tier },
        },
      });
    }

    await admin.from('subscription_events').insert({
      user_id: profile.id,
      event_type: kind === 'credits' ? 'credits_checkout_started' : 'checkout_started',
      source: 'stripe',
      payload: { kind, tier, pack_id: packId, session_id: session.id },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[stripe-checkout]', e);
    return new Response(JSON.stringify({ error: 'Checkout error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
    });
  }
});
