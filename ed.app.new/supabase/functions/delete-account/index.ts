/**
 * Deletes the signed-in user's cloud dreams, media, profile, and auth user.
 * Local device storage is cleared by the client after this returns.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { requireBillableCaller } from '../_shared/auth.ts';

const ALLOWED_ORIGINS = [
  'https://everdream.n1g3.com',
  'https://everdream.app',
  'https://www.everdream.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : 'https://everdream.n1g3.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(data: unknown, status: number, extra: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed. Use POST.' }, 405, headers);

  const caller = await requireBillableCaller(req);
  if ('error' in caller) return json({ error: caller.error }, caller.status, headers);
  if (caller.kind !== 'user') return json({ error: 'Unauthorized' }, 401, headers);

  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return json({ error: 'Account deletion is not configured.' }, 500, headers);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('auth_user_id', caller.user.id)
    .maybeSingle();
  if (profileError) return json({ error: 'Could not load the account.' }, 500, headers);

  if (profile?.id) {
    const { data: dreams } = await admin
      .from('dreams')
      .select('media_storage_path')
      .eq('user_id', profile.id);
    const paths = (dreams || [])
      .map((row) => (typeof row.media_storage_path === 'string' ? row.media_storage_path : ''))
      .filter(Boolean);
    if (paths.length) {
      await admin.storage.from('dream-media').remove(paths);
    }
    const { error: dreamError } = await admin.from('dreams').delete().eq('user_id', profile.id);
    if (dreamError) return json({ error: 'Could not delete dreams.' }, 500, headers);

    await admin.from('sleep_sessions').delete().eq('user_id', profile.id);
    await admin.from('wearable_connections').delete().eq('user_id', profile.id);
    const { error: signupError } = await admin.from('website_signups').delete().eq('profile_id', profile.id);
    if (signupError) return json({ error: 'Could not delete the website signup.' }, 500, headers);

    const { error: profileDeleteError } = await admin.from('profiles').delete().eq('id', profile.id);
    if (profileDeleteError) return json({ error: 'Could not delete the profile.' }, 500, headers);
  }

  const email = typeof caller.user.email === 'string' ? caller.user.email.trim().toLowerCase() : '';
  if (email) {
    const { error: emailSignupError } = await admin.from('website_signups').delete().eq('email', email);
    if (emailSignupError) return json({ error: 'Could not delete the website signup.' }, 500, headers);
  }

  const { error: authError } = await admin.auth.admin.deleteUser(caller.user.id);
  if (authError) return json({ error: 'Dreams were removed, but the login could not be deleted.' }, 500, headers);

  return json({ ok: true }, 200, headers);
});
