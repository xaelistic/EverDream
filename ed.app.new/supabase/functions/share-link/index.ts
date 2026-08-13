/**
 * Public dream share links.
 *
 * POST { dreamId, caption, ogTitle, ogDescription, ogImageUrl }  — JWT required
 * GET  ?slug=                    — public resolve
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ALLOWED_ORIGINS = [
  'https://everdream.n1g3.com',
  'https://everdream.app',
  'https://www.everdream.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

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

function appBaseUrl(): string {
  return (Deno.env.get('APP_BASE_URL') || 'https://everdream.n1g3.com').replace(/\/$/, '');
}

Deno.serve(async (req: Request): Promise<Response> => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: 'Share service is not configured.' }, 500, headers);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    if (req.method === 'GET') {
      const slug = new URL(req.url).searchParams.get('slug');
      if (!slug) return json({ error: 'slug required' }, 400, headers);

      const { data, error } = await admin
        .from('dream_share_links')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('[share-link] lookup failed:', error.message);
        return json({ error: 'Could not load that share link.' }, 500, headers);
      }
      if (!data) return json({ error: 'Share link not found' }, 404, headers);

      await admin
        .from('dream_share_links')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);

      return json({ link: data }, 200, headers);
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, headers);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Sign in to create a share link.' }, 401, headers);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Sign in to create a share link.' }, 401, headers);

    const body = await req.json().catch(() => ({})) as {
      dreamId?: string;
      caption?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImageUrl?: string;
    };
    const dreamId = String(body.dreamId || '').trim();
    if (!dreamId) return json({ error: 'dreamId required' }, 400, headers);

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    if (profileError) {
      console.error('[share-link] profile lookup failed:', profileError.message);
      return json({ error: 'Could not load your profile.' }, 500, headers);
    }
    if (!profile?.id) return json({ error: 'Profile not found. Sign out and back in, then try again.' }, 404, headers);

    const slug = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const { data: link, error } = await admin
      .from('dream_share_links')
      .insert({
        dream_id: dreamId,
        user_id: profile.id,
        slug,
        caption: body.caption || null,
        og_title: body.ogTitle || null,
        og_description: body.ogDescription || null,
        og_image_url: body.ogImageUrl || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[share-link] insert failed:', error.message);
      return json({ error: `Could not save share link: ${error.message}` }, 500, headers);
    }

    return json({
      ok: true,
      slug,
      publicUrl: `${appBaseUrl()}/#/share/${slug}`,
      link,
    }, 200, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected share-link error';
    console.error('[share-link]', message);
    return json({ error: message }, 500, headers);
  }
});
