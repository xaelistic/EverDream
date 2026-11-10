/**
 * Public website email signup.
 * Stores the address on website_signups. If an app profile already
 * uses that email, the row is attached to it.
 *
 * POST { email, source?, page?, referral_code?, company? }
 * company is a honeypot and must be empty.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ALLOWED_ORIGINS = [
  'https://everdream.n1g3.com',
  'https://everdream.app',
  'https://www.everdream.app',
  'http://dmfej25dxvx42nhpcnro44us.185.249.74.204.sslip.io',
  'https://dmfej25dxvx42nhpcnro44us.185.249.74.204.sslip.io',
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

  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return json({ error: 'Signup is not configured.' }, 500, headers);

  let body: { email?: string; source?: string; page?: string; referral_code?: string; company?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, headers);
  }

  if (typeof body.company === 'string' && body.company.trim()) {
    return json({ ok: true }, 200, headers);
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'Enter a valid email address.' }, 400, headers);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.rpc('record_website_signup', {
    signup_email: email,
    signup_source: body.source || 'website',
    signup_page: body.page || null,
    signup_referral: body.referral_code || null,
  });
  if (error) return json({ error: 'Could not save that signup.' }, 500, headers);
  return json({ ok: true }, 200, headers);
});
