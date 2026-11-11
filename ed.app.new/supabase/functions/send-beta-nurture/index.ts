/**
 * Sends due beta nurture letters.
 * POST with header x-cron-secret matching NURTURE_CRON_SECRET.
 * Mail leaves only when RESEND_API_KEY and NEWSLETTER_FROM are set.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { dispatchDueNewsletters } from '../_shared/betaNurture.ts';

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed. Use POST.' }, 405);

  const secret = Deno.env.get('NURTURE_CRON_SECRET') || '';
  const given = req.headers.get('x-cron-secret') || '';
  if (!secret || given !== secret) return json({ error: 'Unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return json({ error: 'Nurture is not configured.' }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const result = await dispatchDueNewsletters(admin, 25);
    return json(result, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nurture send failed';
    console.error('[send-beta-nurture]', message);
    return json({ error: 'Could not send the due notes.' }, 500);
  }
});
