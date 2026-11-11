/**
 * Leaves the beta list. Token comes from the letter footer.
 * GET /newsletter-unsubscribe?token=<uuid>
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function siteUrl(): string {
  return (
    Deno.env.get('SITE_URL') ||
    'http://dmfej25dxvx42nhpcnro44us.185.249.74.204.sslip.io'
  ).replace(/\/$/, '');
}

function redirect(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url } });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const site = siteUrl();
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return redirect(`${site}/beta`);
  }

  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) return redirect(`${site}/beta`);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc('unsubscribe_beta_newsletter', { token });
  if (error || data !== true) return redirect(`${site}/beta`);
  return redirect(`${site}/beta?left=1`);
});
