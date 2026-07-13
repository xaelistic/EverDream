import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://everdream.n1g3.com',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const appBase = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173';
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const slug = url.searchParams.get('slug');
      if (!slug) return json({ error: 'slug required' }, 400);

      const { data, error } = await admin
        .from('dream_share_links')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: 'Not found' }, 404);

      await admin
        .from('dream_share_links')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);

      return json({ link: data });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const { dreamId, caption, ogTitle, ogDescription, ogImageUrl } = body;
    if (!dreamId) return json({ error: 'dreamId required' }, 400);

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    if (!profile) return json({ error: 'Profile not found' }, 404);

    const slug = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const { data: link, error } = await admin
      .from('dream_share_links')
      .insert({
        dream_id: String(dreamId),
        user_id: profile.id,
        slug,
        caption,
        og_title: ogTitle,
        og_description: ogDescription,
        og_image_url: ogImageUrl,
      })
      .select()
      .single();

    if (error) return json({ error: error.message }, 500);

    const publicUrl = `${appBase}/#/share/${slug}`;
    return json({ ok: true, slug, publicUrl, link });
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