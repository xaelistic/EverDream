import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://everdream.n1g3.com',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const SCOPES = 'user.info.basic,video.publish';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const clientKey = Deno.env.get('TIKTOK_CLIENT_KEY') || '';
  const clientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const appBase = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173';
  const redirectUri = `${supabaseUrl}/functions/v1/social-oauth-tiktok`;

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        return new Response('Missing code or state', { status: 400, headers: CORS_HEADERS });
      }

      const admin = createClient(supabaseUrl, serviceKey);
      const { data: stateRow } = await admin
        .from('oauth_states')
        .select('auth_user_id')
        .eq('id', state)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      const userId = stateRow?.auth_user_id;
      if (!userId) {
        return redirect(`${appBase}/#/?social=tiktok_error`);
      }

      await admin.from('oauth_states').delete().eq('id', state);

      const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        return redirect(`${appBase}/#/?social=tiktok_error`);
      }

      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('auth_user_id', userId)
        .single();

      if (profile) {
        await admin.from('social_accounts').upsert({
          user_id: profile.id,
          provider: 'tiktok',
          provider_user_id: tokenData.open_id || 'tiktok-user',
          scopes: SCOPES.split(','),
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
          metadata: { open_id: tokenData.open_id },
          status: 'active',
        }, { onConflict: 'user_id,provider' });
      }

      return redirect(`${appBase}/#/?social=tiktok_linked`);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    if (body.action !== 'start') return json({ error: 'Invalid action' }, 400);

    const stateId = crypto.randomUUID();
    await admin.from('oauth_states').insert({
      id: stateId,
      auth_user_id: user.id,
      provider: 'tiktok',
      intent: body.intent || 'link',
    });

    const authUrl = new URL(TIKTOK_AUTH_URL);
    authUrl.searchParams.set('client_key', clientKey);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', stateId);

    return json({ ok: true, authUrl: authUrl.toString() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function redirect(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url, ...CORS_HEADERS } });
}