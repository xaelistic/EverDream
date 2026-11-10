/**
 * Discord OAuth — link a Discord account to the signed-in EverDream profile.
 *
 * POST { action: "start" }  — user JWT — returns { authUrl }
 * GET  ?code=&state=        — Discord callback
 *
 * Redirect URI to register on the Discord application:
 *   https://supabase.n1g3.com/functions/v1/social-oauth-discord
 *
 * Secrets:
 *   DISCORD_CLIENT_ID
 *   DISCORD_CLIENT_SECRET
 *   APP_BASE_URL
 *   SUPABASE_PUBLIC_URL
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ALLOWED_ORIGINS = [
  'https://everdream.n1g3.com',
  'https://everdream.app',
  'https://www.everdream.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_ME_URL = 'https://discord.com/api/users/@me';
const SCOPES = 'identify email';

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : 'https://everdream.n1g3.com',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

function json(data: unknown, status: number, extra: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function redirect(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url } });
}

function publicSupabaseUrl(): string {
  return (
    Deno.env.get('SUPABASE_PUBLIC_URL') ||
    Deno.env.get('SERVICE_URL_SUPABASEKONG') ||
    'https://supabase.n1g3.com'
  ).replace(/\/$/, '');
}

function appBaseUrl(): string {
  return (Deno.env.get('APP_BASE_URL') || 'https://everdream.n1g3.com').replace(/\/$/, '');
}

function redirectUri(): string {
  return `${publicSupabaseUrl()}/functions/v1/social-oauth-discord`;
}

type DiscordUser = {
  id: string;
  username?: string;
  global_name?: string | null;
  discriminator?: string;
  email?: string | null;
  avatar?: string | null;
};

async function exchangeCode(code: string, clientId: string, clientSecret: string) {
  const response = await fetch(DISCORD_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Discord token ${response.status}`);
  }
  return data as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
}

async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch(DISCORD_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  if (!response.ok || !data.id) {
    throw new Error(data.message || `Discord user ${response.status}`);
  }
  return data as DiscordUser;
}

function avatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  const clientId = Deno.env.get('DISCORD_CLIENT_ID') || '';
  const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const appBase = appBaseUrl();

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      if (error || !code || !state || !clientId || !clientSecret) {
        return redirect(`${appBase}/?auth=callback&social=discord_error`);
      }

      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: stateRow } = await admin
        .from('oauth_states')
        .select('auth_user_id')
        .eq('id', state)
        .eq('provider', 'discord')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      const userId = stateRow?.auth_user_id;
      if (!userId) return redirect(`${appBase}/?auth=callback&social=discord_error`);
      await admin.from('oauth_states').delete().eq('id', state);

      const token = await exchangeCode(code, clientId, clientSecret);
      const discordUser = await fetchDiscordUser(token.access_token);
      const { data: profile } = await admin
        .from('profiles')
        .select('id, email')
        .eq('auth_user_id', userId)
        .maybeSingle();
      if (!profile?.id) return redirect(`${appBase}/?auth=callback&social=discord_error`);

      const { data: taken } = await admin
        .from('social_accounts')
        .select('user_id')
        .eq('provider', 'discord')
        .eq('provider_user_id', discordUser.id)
        .maybeSingle();
      if (taken?.user_id && taken.user_id !== profile.id) {
        return redirect(`${appBase}/?auth=callback&social=discord_taken`);
      }

      const { error: upsertError } = await admin.from('social_accounts').upsert({
        user_id: profile.id,
        provider: 'discord',
        provider_user_id: discordUser.id,
        username: discordUser.username || null,
        display_name: discordUser.global_name || discordUser.username || null,
        avatar_url: avatarUrl(discordUser),
        email: discordUser.email || null,
        scopes: (token.scope || SCOPES).split(/[ ,]+/).filter(Boolean),
        access_token: token.access_token,
        refresh_token: token.refresh_token || null,
        token_expires_at: new Date(Date.now() + (token.expires_in || 604800) * 1000).toISOString(),
        metadata: { discriminator: discordUser.discriminator || '0' },
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });
      if (upsertError) return redirect(`${appBase}/?auth=callback&social=discord_error`);

      const emails = [profile.email, discordUser.email]
        .filter((value): value is string => typeof value === 'string' && value.includes('@'))
        .map((value) => value.toLowerCase());
      if (emails.length) {
        await admin
          .from('website_signups')
          .update({ profile_id: profile.id, updated_at: new Date().toISOString() })
          .in('email', emails)
          .is('profile_id', null);
      }

      return redirect(`${appBase}/?auth=callback&social=discord_linked`);
    }

    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Sign in first to connect Discord.' }, 401, headers);
    if (!clientId || !clientSecret) {
      return json({
        error: 'Discord is not configured. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.',
      }, 503, headers);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: 'Sign in first to connect Discord.' }, 401, headers);

    const body = await req.json().catch(() => ({})) as { action?: string; intent?: string };
    if (body.action !== 'start') return json({ error: 'Invalid action' }, 400, headers);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const stateId = crypto.randomUUID();
    const { error: stateError } = await admin.from('oauth_states').insert({
      id: stateId,
      auth_user_id: authData.user.id,
      provider: 'discord',
      intent: body.intent || 'link',
    });
    if (stateError) return json({ error: 'Could not start Discord.' }, 500, headers);

    const authUrl = new URL(DISCORD_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri());
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', stateId);
    authUrl.searchParams.set('prompt', 'consent');
    return json({ ok: true, authUrl: authUrl.toString() }, 200, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected Discord error';
    console.error('[social-oauth-discord]', message);
    if (req.method === 'GET') return redirect(`${appBaseUrl()}/?auth=callback&social=discord_error`);
    return json({ error: message }, 500, headers);
  }
});
