import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://everdream.n1g3.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const body = await req.json();
    const tier = body.tier as 'plus' | 'pro';
    const profileId = body.profile_id as string;
    const successUrl = body.success_url as string;
    const cancelUrl = body.cancel_url as string;

    const priceId =
      tier === 'pro'
        ? Deno.env.get('STRIPE_PRICE_PRO_MONTHLY')
        : Deno.env.get('STRIPE_PRICE_PLUS_MONTHLY');

    if (!priceId || !profileId) {
      return new Response(JSON.stringify({ error: 'Missing price or profile' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, auth_user_id, stripe_customer_id')
      .eq('id', profileId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let customerId = profile.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { profile_id: profileId, auth_user_id: profile.auth_user_id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', profileId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { profile_id: profileId, tier },
      subscription_data: {
        metadata: { profile_id: profileId, tier },
      },
    });

    await supabase.from('subscription_events').insert({
      user_id: profileId,
      event_type: 'checkout_started',
      source: 'stripe',
      payload: { tier, session_id: session.id },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[stripe-checkout]', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Checkout error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});