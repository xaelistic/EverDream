import { supabase } from './supabase/client';
import type { WearableAuth, WearableProvider } from './wearables';

export async function exchangeWearableOAuthCode(
  provider: WearableProvider,
  code: string,
  redirectUri: string,
): Promise<WearableAuth> {
  const { data, error } = await supabase.functions.invoke('wearable-oauth-exchange', {
    body: { provider, code, redirect_uri: redirectUri },
  });

  if (error) {
    throw new Error(error.message || 'OAuth exchange request failed');
  }

  if (!data?.success || !data?.auth?.accessToken) {
    throw new Error(data?.error || 'OAuth exchange failed. Try connecting with a personal access token.');
  }

  return {
    provider,
    accessToken: data.auth.accessToken,
    refreshToken: data.auth.refreshToken,
    expiresAt: data.auth.expiresAt,
  };
}