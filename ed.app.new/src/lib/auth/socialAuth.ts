import type { Provider } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';

export type SocialAuthProvider = 'google' | 'facebook' | 'apple' | 'meta' | 'tiktok';

export type SocialAuthIntent = 'login' | 'link';

const SUPABASE_PROVIDERS: Record<string, Provider> = {
  google: 'google',
  facebook: 'facebook',
  meta: 'facebook',
  apple: 'apple',
};

const META_SCOPES = [
  'public_profile',
  'email',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
].join(',');

const GOOGLE_SCOPES = 'openid profile email';

function getRedirectUrl(intent: SocialAuthIntent = 'login'): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  const hash = intent === 'link' ? '#/?social=link' : '#/';
  return `${base}${hash}`;
}

export function getOAuthScopes(provider: SocialAuthProvider): string | undefined {
  if (provider === 'facebook' || provider === 'meta') return META_SCOPES;
  if (provider === 'google') return GOOGLE_SCOPES;
  return undefined;
}

export async function signInWithSocialProvider(
  provider: SocialAuthProvider,
  intent: SocialAuthIntent = 'login',
): Promise<{ ok: boolean; message?: string }> {
  const supabaseProvider = SUPABASE_PROVIDERS[provider];
  if (!supabaseProvider) {
    return { ok: false, message: `${provider} OAuth is not configured yet.` };
  }

  const scopes = getOAuthScopes(provider);
  const redirectTo = getRedirectUrl(intent);

  if (intent === 'link') {
    const { error } = await supabase.auth.linkIdentity({
      provider: supabaseProvider,
      options: {
        redirectTo,
        scopes,
        queryParams: supabaseProvider === 'google'
          ? { access_type: 'offline', prompt: 'consent' }
          : undefined,
      },
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: supabaseProvider,
    options: {
      redirectTo,
      scopes,
      queryParams: supabaseProvider === 'google'
        ? { access_type: 'offline', prompt: 'consent' }
        : undefined,
    },
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function startTikTokOAuth(intent: SocialAuthIntent = 'link'): Promise<{ ok: boolean; url?: string; message?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, message: 'Sign in first to link TikTok.' };
  }

  const { data, error } = await supabase.functions.invoke('social-oauth-tiktok', {
    body: { action: 'start', intent, redirectTo: getRedirectUrl(intent) },
  });

  if (error) return { ok: false, message: error.message };
  if (!data?.authUrl) return { ok: false, message: data?.error || 'TikTok OAuth URL not returned.' };
  return { ok: true, url: data.authUrl };
}

export async function syncSocialTokensFromSession(): Promise<{ ok: boolean; synced: string[]; message?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, synced: [], message: 'No active session.' };
  }

  const provider = session.user.app_metadata?.provider as string | undefined;
  const providerToken = session.provider_token;
  const providerRefresh = session.provider_refresh_token;

  if (!provider || !providerToken) {
    return { ok: true, synced: [], message: 'No provider token in session (may already be synced).' };
  }

  const { data, error } = await supabase.functions.invoke('social-token-sync', {
    body: {
      provider: provider === 'facebook' ? 'meta' : provider,
      providerToken,
      providerRefreshToken: providerRefresh,
      userMetadata: session.user.user_metadata,
    },
  });

  if (error) return { ok: false, synced: [], message: error.message };
  return { ok: true, synced: data?.synced || [provider] };
}

export function isSocialOAuthCallback(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return hash.includes('access_token=')
    || search.includes('code=')
    || search.includes('social=');
}

export function clearSocialOAuthParams(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('social');
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, document.title, `${url.pathname}${url.hash || '#/'}`);
}