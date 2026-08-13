import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import {
  clearSocialOAuthParams,
  isSocialOAuthCallback,
  syncSocialTokensFromSession,
} from '../lib/auth/socialAuth';
import { fetchLinkedSocialAccounts, type SocialAccountPublic } from '../lib/social/socialAccounts';
import { importLinkedSocialInterestsIntoProfile } from '../lib/social/profileSignals';
import { useToast } from '../components/ui/Toast';

export function useSocialAuth() {
  const { addToast } = useToast();
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
      const params = new URLSearchParams(window.location.search);
      const social = params.get('social');

      if (social === 'spotify_linked') {
        setSyncing(true);
        try {
          const signals = await importLinkedSocialInterestsIntoProfile();
          if (!mounted) return;
          await refreshAccounts();
          addToast({
            type: 'success',
            message: signals.length
              ? `Spotify connected — added ${signals.length} taste${signals.length === 1 ? '' : 's'} to your profile.`
              : 'Spotify connected.',
          });
          setLastMessage('spotify_linked');
        } catch (err) {
          if (!mounted) return;
          addToast({
            type: 'error',
            message: err instanceof Error ? err.message : 'Spotify connected, but tastes could not be imported.',
          });
        } finally {
          if (mounted) {
            clearSocialOAuthParams();
            setSyncing(false);
          }
        }
        return;
      }

      if (social === 'spotify_error') {
        addToast({ type: 'error', message: 'Spotify connection was cancelled or failed. Try again.' });
        clearSocialOAuthParams();
        return;
      }

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