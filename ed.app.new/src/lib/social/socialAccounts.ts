import { supabase, getProfile } from '../supabase/client';
import type { SocialProviderId } from '../socialShare';

export interface SocialAccountPublic {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
  status: string;
  token_expires_at?: string | null;
  linked_at: string;
  updated_at: string;
}

export async function fetchLinkedSocialAccounts(): Promise<SocialAccountPublic[]> {
  const profile = await getProfile();
  if (!profile?.id) return [];

  const { data, error } = await supabase
    .from('social_accounts_public')
    .select('*')
    .eq('user_id', profile.id as string)
    .eq('status', 'active')
    .order('linked_at', { ascending: false });

  if (error) {
    console.warn('[socialAccounts] fetch error:', error.message);
    return [];
  }
  return (data || []) as SocialAccountPublic[];
}

export function isProviderLinkedInDb(
  accounts: SocialAccountPublic[],
  providerId: SocialProviderId,
): boolean {
  const aliases: Record<string, string[]> = {
    meta: ['meta', 'facebook'],
    facebook: ['meta', 'facebook'],
    instagram: ['instagram', 'meta', 'facebook'],
  };
  const check = aliases[providerId] || [providerId];
  return accounts.some((a) => check.includes(a.provider) && a.status === 'active');
}

export async function unlinkSocialAccount(providerId: SocialProviderId): Promise<boolean> {
  const profile = await getProfile();
  if (!profile?.id) return false;

  const providers = providerId === 'meta' || providerId === 'facebook'
    ? ['meta', 'facebook']
    : [providerId];

  const { error } = await supabase
    .from('social_accounts')
    .delete()
    .eq('user_id', profile.id as string)
    .in('provider', providers);

  if (error) {
    console.warn('[socialAccounts] unlink error:', error.message);
    return false;
  }
  return true;
}