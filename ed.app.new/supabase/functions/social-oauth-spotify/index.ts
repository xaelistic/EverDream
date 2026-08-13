/**
 * Spotify OAuth (link tastes, not login).
 *
 * POST { action: "start" }  — JWT required — returns { authUrl }
 * GET  ?code=&state=        — Spotify callback
 *
 * Secrets:
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   APP_BASE_URL            (https://everdream.n1g3.com)
 *   SUPABASE_PUBLIC_URL     (https://supabase.n1g3.com)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ALLOWED_ORIGINS = [
  'https://everdream.n1g3.com',
  'https://everdream.app',
  'https://www.everdream.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-top-read',
  'user-read-recently-played',
].join(' ');

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin)
      ? origin
      : 'https://everdream.n1g3.com',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
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
  return `${publicSupabaseUrl()}/functions/v1/social-oauth-spotify`;
}

function basicAuth(id: string, secret: string): string {
  return `Basic ${btoa(`${id}:${secret}`)}`;
}

function uniqueStrings(values: string[], limit = 16): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

async function exchangeCode(code: string, id: string, secret: string) {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(id, secret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Spotify token ${response.status}`);
  }
  return data as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
}

async function spotifyGet<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify ${path} ${response.status}: ${text.slice(0, 180)}`);
  }
  return await response.json() as T;
}

async function fetchSpotifyTastes(accessToken: string) {
  const me = await spotifyGet<{
    id: string;
    display_name?: string;
    email?: string;
    images?: Array<{ url?: string }>;
  }>('/me', accessToken);

  let artists: Array<{ name?: string; genres?: string[] }> = [];
  try {
    const top = await spotifyGet<{ items?: Array<{ name?: string; genres?: string[] }> }>(
      '/me/top/artists?time_range=medium_term&limit=20',
      accessToken,
    );
    artists = top.items || [];
  } catch {
    artists = [];
  }

  const topArtists = uniqueStrings(artists.map((a) => a.name || ''), 12);
  const topGenres = uniqueStrings(artists.flatMap((a) => a.genres || []), 16);

  return {
    me,
    metadata: {
      top_genres: topGenres,
      top_artists: topArtists,
      display_name: me.display_name || null,
    },
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID') || '';
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET') || '';
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

      if (error) {
        return redirect(`${appBase}/?auth=callback&social=spotify_error`);
      }
      if (!code || !state) {
        return json({ error: 'Missing code or state' }, 400, headers);
      }
      if (!clientId || !clientSecret) {
        return redirect(`${appBase}/?auth=callback&social=spotify_error`);
      }

      const admin = createClient(supabaseUrl, serviceKey);
      const { data: stateRow } = await admin
        .from('oauth_states')
        .select('auth_user_id')
        .eq('id', state)
        .eq('provider', 'spotify')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      const userId = stateRow?.auth_user_id;
      if (!userId) {
        return redirect(`${appBase}/?auth=callback&social=spotify_error`);
      }
      await admin.from('oauth_states').delete().eq('id', state);

      const token = await exchangeCode(code, clientId, clientSecret);
      const tastes = await fetchSpotifyTastes(token.access_token);

      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (profile?.id) {
        await admin.from('social_accounts').upsert({
          user_id: profile.id,
          provider: 'spotify',
          provider_user_id: tastes.me.id,
          username: tastes.me.display_name || null,
          display_name: tastes.me.display_name || null,
          avatar_url: tastes.me.images?.[0]?.url || null,
          email: tastes.me.email || null,
          scopes: (token.scope || SCOPES).split(/[ ,]+/).filter(Boolean),
          access_token: token.access_token,
          refresh_token: token.refresh_token || null,
          token_expires_at: new Date(Date.now() + (token.expires_in || 3600) * 1000).toISOString(),
          metadata: tastes.metadata,
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider' });
      }

      return redirect(`${appBase}/?auth=callback&social=spotify_linked`);
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, headers);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401, headers);
    if (!clientId || !clientSecret) {
      return json({
        error: 'Spotify is not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.',
      }, 503, headers);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Sign in first to connect Spotify.' }, 401, headers);

    const body = await req.json().catch(() => ({})) as { action?: string; intent?: string };
    if (body.action !== 'start') return json({ error: 'Invalid action' }, 400, headers);

    const stateId = crypto.randomUUID();
    const { error: stateError } = await admin.from('oauth_states').insert({
      id: stateId,
      auth_user_id: user.id,
      provider: 'spotify',
      intent: body.intent || 'link',
    });
    if (stateError) {
      return json({ error: `Could not start Spotify OAuth: ${stateError.message}` }, 500, headers);
    }

    const authUrl = new URL(SPOTIFY_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri());
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', stateId);
    authUrl.searchParams.set('show_dialog', 'true');

    return json({ ok: true, authUrl: authUrl.toString() }, 200, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected Spotify OAuth error';
    console.error('[social-oauth-spotify]', message);
    if (req.method === 'GET') {
      return redirect(`${appBase}/?auth=callback&social=spotify_error`);
    }
    return json({ error: message }, 500, headers);
  }
});
