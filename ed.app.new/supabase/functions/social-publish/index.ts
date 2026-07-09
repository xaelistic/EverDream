import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishBody {
  provider: 'facebook' | 'instagram' | 'tiktok';
  dreamId?: string;
  caption?: string;
  imageUrl?: string;
  shareUrl?: string;
  title?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const appBase = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = (await req.json()) as PublishBody;
    const { provider, caption = '', imageUrl, shareUrl = appBase } = body;

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    if (!profile) return json({ error: 'Profile not found' }, 404);

    const providerKey = provider === 'facebook' ? 'meta' : provider;
    const { data: account } = await admin
      .from('social_accounts')
      .select('*')
      .eq('user_id', profile.id)
      .eq('provider', providerKey)
      .eq('status', 'active')
      .maybeSingle();

    if (!account?.access_token) {
      return json({
        published: false,
        fallback: 'dialog',
        dialogUrl: buildDialogUrl(provider, shareUrl, caption),
        error: `${provider} not linked`,
      });
    }

    if (provider === 'facebook') {
      return json(await publishFacebook(account, caption, shareUrl));
    }
    if (provider === 'instagram') {
      return json(await publishInstagram(account, caption, imageUrl));
    }
    if (provider === 'tiktok') {
      return json(await publishTikTok(account, caption, imageUrl, shareUrl));
    }

    return json({ published: false, error: 'Unknown provider' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});

async function publishFacebook(
  account: Record<string, unknown>,
  caption: string,
  shareUrl: string,
): Promise<Record<string, unknown>> {
  const metadata = (account.metadata || {}) as Record<string, unknown>;
  const pageId = metadata.default_page_id as string | undefined;
  const pageToken = metadata.default_page_access_token as string | undefined;

  if (!pageId || !pageToken) {
    return {
      published: false,
      fallback: 'dialog',
      dialogUrl: buildDialogUrl('facebook', shareUrl, caption),
      error: 'No Facebook Page connected. Grant pages_show_list and reconnect Meta.',
    };
  }

  const params = new URLSearchParams({
    message: caption,
    link: shareUrl,
    access_token: pageToken,
  });

  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    body: params,
  });
  const data = await res.json();

  if (!res.ok) {
    return {
      published: false,
      fallback: 'dialog',
      dialogUrl: buildDialogUrl('facebook', shareUrl, caption),
      error: data.error?.message || 'Facebook publish failed',
    };
  }

  return {
    published: true,
    postId: data.id,
    postUrl: `https://www.facebook.com/${data.id}`,
    message: 'Posted to your Facebook Page',
  };
}

async function publishInstagram(
  account: Record<string, unknown>,
  caption: string,
  imageUrl?: string,
): Promise<Record<string, unknown>> {
  if (!imageUrl) {
    return { published: false, error: 'Instagram requires a dream image URL' };
  }

  const metadata = (account.metadata || {}) as Record<string, unknown>;
  const igUserId = metadata.instagram_business_account_id as string | undefined;
  const pageToken = metadata.default_page_access_token as string | undefined;

  if (!igUserId || !pageToken) {
    return {
      published: false,
      error: 'No Instagram Business account linked to your Facebook Page. Connect Meta and link IG in Business settings.',
    };
  }

  const createParams = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: pageToken,
  });

  const createRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media`,
    { method: 'POST', body: createParams },
  );
  const createData = await createRes.json();
  if (!createRes.ok) {
    return { published: false, error: createData.error?.message || 'IG media create failed' };
  }

  const publishParams = new URLSearchParams({
    creation_id: createData.id,
    access_token: pageToken,
  });
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
    { method: 'POST', body: publishParams },
  );
  const publishData = await publishRes.json();

  if (!publishRes.ok) {
    return { published: false, error: publishData.error?.message || 'IG publish failed' };
  }

  return {
    published: true,
    postId: publishData.id,
    message: 'Posted to Instagram',
  };
}

async function publishTikTok(
  account: Record<string, unknown>,
  caption: string,
  imageUrl?: string,
  shareUrl?: string,
): Promise<Record<string, unknown>> {
  const accessToken = account.access_token as string;
  if (!accessToken) {
    return { published: false, error: 'TikTok not linked' };
  }

  if (!imageUrl) {
    return { published: false, error: 'TikTok photo post requires an image' };
  }

  const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 150),
        description: `${caption}\n${shareUrl || ''}`.slice(0, 2200),
        disable_comment: false,
        privacy_level: 'PUBLIC_TO_EVERYONE',
      },
      source_info: {
        source: 'PULL_FROM_URL',
        photo_cover_index: 0,
        photo_images: [imageUrl],
      },
      post_mode: 'DIRECT_POST',
      media_type: 'PHOTO',
    }),
  });

  const initData = await initRes.json();
  if (!initRes.ok) {
    return {
      published: false,
      error: initData.error?.message || JSON.stringify(initData) || 'TikTok init failed',
    };
  }

  return {
    published: true,
    postId: initData.data?.publish_id,
    message: 'TikTok post initiated',
  };
}

function buildDialogUrl(provider: string, url: string, text: string): string {
  if (provider === 'facebook') {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
  }
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}