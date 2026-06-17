import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Content-Type': 'application/json' };

interface RcEvent {
  event: {
    type: string;
    app_user_id: string;
    product_id?: string;
    entitlement_ids?: string[];
    expiration_at_ms?: number | null;
    store?: string;
  };
}

function tierFromEntitlements(ids: string[] | undefined, productId?: string): 'free' | 'plus' | 'pro' {
  const all = [...(ids ?? []), productId ?? ''].join(' ').toLowerCase();
  if (all.includes('pro')) return 'pro';
  if (all.includes('plus')) return 'plus';
  return 'free';
}

function storeToSource(store?: string): 'apple' | 'google' | 'revenuecat' {
  if (store === 'APP_STORE') return 'apple';
  if (store === 'PLAY_STORE') return 'google';
  return 'revenuecat';
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = req.headers.get('Authorization');
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload: RcEvent = await req.json();
  const ev = payload.event;
  if (!ev?.app_user_id) {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const authUserId = ev.app_user_id;

  let profileId: string | null = null;

  const { data: byAuth } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  profileId = byAuth?.id ?? null;

  if (!profileId) {
    const { data: byRc } = await supabase
      .from('profiles')
      .select('id')
      .eq('revenuecat_app_user_id', authUserId)
      .maybeSingle();
    profileId = byRc?.id ?? null;
  }

  if (!profileId) {
    console.warn('[revenuecat-webhook] No profile for', authUserId);
    return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders });
  }

  const cancelTypes = ['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE'];
  let tier: 'free' | 'plus' | 'pro' = 'free';

  if (!cancelTypes.includes(ev.type)) {
    tier = tierFromEntitlements(ev.entitlement_ids, ev.product_id);
  }

  const expiresAt = ev.expiration_at_ms
    ? new Date(ev.expiration_at_ms).toISOString()
    : null;

  await supabase.from('profiles').update({
    subscription_tier: tier,
    subscription_source: storeToSource(ev.store),
    subscription_expires_at: expiresAt,
    revenuecat_app_user_id: authUserId,
  }).eq('id', profileId);

  await supabase.from('subscription_events').insert({
    user_id: profileId,
    event_type: ev.type,
    source: 'revenuecat',
    payload: ev as unknown as Record<string, unknown>,
  });

  return new Response(JSON.stringify({ ok: true, tier }), { headers: corsHeaders });
});