import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import {
  clearSocialOAuthParams,
  isSocialOAuthCallback,
  syncSocialTokensFromSession,
} from '../lib/auth/socialAuth';
import { fetchLinkedSocialAccounts, type SocialAccountPublic } from '../lib/social/socialAccounts';

export function useSocialAuth() {
  const [accounts, setAccounts] = useState<SocialAccountPublic[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const refreshAccounts = async () => {
    const linked = await fetchLinkedSocialAccounts();
    setAccounts(linked);
    return linked;
  };

  useEffect(() => {
    let mounted = true;

    async function handleOAuthReturn() {
      if (!isSocialOAuthCallback()) return;

      setSyncing(true);
      const result = await syncSocialTokensFromSession();
      if (!mounted) return;

      if (result.message) setLastMessage(result.message);
      await refreshAccounts();
      clearSocialOAuthParams();
      setSyncing(false);
    }

    handleOAuthReturn();
    refreshAccounts();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSyncing(true);
        await syncSocialTokensFromSession();
        await refreshAccounts();
        setSyncing(false);
      }
      if (event === 'SIGNED_OUT') {
        setAccounts([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { accounts, syncing, lastMessage, refreshAccounts };
}