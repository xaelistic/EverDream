import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2023-10-16' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

async function updateProfileTier(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
  tier: 'free' | 'plus' | 'pro',
  extra: Record<string, unknown> = {},
) {
  await supabase.from('profiles').update({
    subscription_tier: tier,
    subscription_source: 'stripe',
    ...extra,
  }).eq('id', profileId);

  await supabase.from('subscription_events').insert({
    user_id: profileId,
    event_type: 'tier_updated',
    source: 'stripe',
    payload: { tier, ...extra },
  });
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature || !webhookSecret) {
    return new Response('Webhook not configured', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    return new Response(`Invalid signature: ${e}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const profileId = session.metadata?.profile_id;
      const tier = (session.metadata?.tier || 'plus') as 'plus' | 'pro';
      if (profileId && session.subscription) {
        await updateProfileTier(supabase, profileId, tier, {
          stripe_subscription_id: session.subscription,
        });
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription;
      const profileId = sub.metadata?.profile_id;
      const tier = (sub.metadata?.tier || 'plus') as 'plus' | 'pro';
      if (profileId && sub.status === 'active') {
        const expires = new Date(sub.current_period_end * 1000).toISOString();
        await updateProfileTier(supabase, profileId, tier, {
          stripe_subscription_id: sub.id,
          subscription_expires_at: expires,
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const profileId = sub.metadata?.profile_id;
      if (profileId) {
        await updateProfileTier(supabase, profileId, 'free', {
          stripe_subscription_id: null,
          subscription_expires_at: null,
        });
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});