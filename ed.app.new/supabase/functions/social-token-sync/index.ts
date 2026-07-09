import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncBody {
  provider?: string;
  providerToken?: string;
  providerRefreshToken?: string;
  userMetadata?: Record<string, unknown>;
}

async function fetchMetaMetadata(accessToken: string): Promise<Record<string, unknown>> {
  const metadata: Record<string, unknown> = {};
  try {
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture&access_token=${accessToken}`,
    );
    if (meRes.ok) metadata.profile = await meRes.json();

    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`,
    );
    if (pagesRes.ok) {
      const pages = await pagesRes.json();
      metadata.pages = pages.data || [];
      const firstPage = pages.data?.[0];
      if (firstPage?.instagram_business_account?.id) {
        metadata.instagram_business_account_id = firstPage.instagram_business_account.id;
        metadata.default_page_id = firstPage.id;
        metadata.default_page_access_token = firstPage.access_token;
      } else if (firstPage) {
        metadata.default_page_id = firstPage.id;
        metadata.default_page_access_token = firstPage.access_token;
      }
    }
  } catch (e) {
    metadata.fetch_error = e instanceof Error ? e.message : String(e);
  }
  return metadata;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = (await req.json()) as SyncBody;
    const provider = body.provider || user.app_metadata?.provider || 'unknown';
    const providerToken = body.providerToken;
    if (!providerToken) return json({ error: 'No provider token supplied' }, 400);

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) return json({ error: 'Profile not found' }, 404);

    const normalizedProvider = provider === 'facebook' ? 'meta' : provider;
    const userMeta = body.userMetadata || user.user_metadata || {};

    let metadata: Record<string, unknown> = {};
    let providerUserId = String(userMeta.provider_id || userMeta.sub || user.id);
    let displayName = String(userMeta.full_name || userMeta.name || '');
    let avatarUrl = String(userMeta.avatar_url || userMeta.picture || '');
    let email = String(userMeta.email || user.email || '');

    if (normalizedProvider === 'meta') {
      metadata = await fetchMetaMetadata(providerToken);
      const profileData = metadata.profile as Record<string, string> | undefined;
      if (profileData?.id) providerUserId = profileData.id;
      if (profileData?.name) displayName = profileData.name;
      if (profileData?.email) email = profileData.email;
    }

    const record = {
      user_id: profile.id,
      provider: normalizedProvider,
      provider_user_id: providerUserId,
      display_name: displayName || null,
      avatar_url: avatarUrl || null,
      email: email || null,
      scopes: normalizedProvider === 'meta'
        ? ['public_profile', 'email', 'pages_show_list', 'pages_manage_posts', 'instagram_content_publish']
        : ['openid', 'profile', 'email'],
      access_token: providerToken,
      refresh_token: body.providerRefreshToken || null,
      metadata,
      status: 'active',
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await admin
      .from('social_accounts')
      .upsert(record, { onConflict: 'user_id,provider' });

    if (upsertError) return json({ error: upsertError.message }, 500);

    return json({ ok: true, synced: [normalizedProvider], metadata });
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