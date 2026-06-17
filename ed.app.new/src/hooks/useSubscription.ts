import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './use-auth';
import {
  initSubscriptions,
  refreshSubscription,
  purchaseTier,
  restorePurchases,
  manageSubscription,
  getOfferings,
  isSubscriptionsEnabled,
  getLimitsForTier,
  type SubscriptionState,
  type SubscriptionOffering,
} from '../lib/subscriptions/subscriptionService';
import {
  parseSubscriptionReturn,
  clearSubscriptionReturnParams,
} from '../lib/subscriptions/stripe';

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [offerings, setOfferings] = useState<SubscriptionOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await initSubscriptions(user?.id ?? null);
      setState(s);
      const o = await getOfferings();
      setOfferings(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const { status } = parseSubscriptionReturn();
    if (status === 'success') {
      refreshSubscription().then(setState).finally(() => {
        clearSubscriptionReturnParams();
      });
    } else if (status === 'cancelled') {
      clearSubscriptionReturnParams();
    }
  }, []);

  const subscribe = useCallback(
    async (tier: 'plus' | 'pro', packageId?: string) => {
      setPurchasing(true);
      setError(null);
      try {
        const s = await purchaseTier(tier, packageId);
        setState(s);
        if (user?.id) {
          const refreshed = await refreshSubscription();
          setState(refreshed);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Purchase failed';
        if (!msg.includes('cancelled') && !msg.includes('canceled')) {
          setError(msg);
        }
        throw e;
      } finally {
        setPurchasing(false);
      }
    },
    [user?.id],
  );

  const restore = useCallback(async () => {
    setPurchasing(true);
    try {
      const s = await restorePurchases();
      setState(s);
    } finally {
      setPurchasing(false);
    }
  }, []);

  const manage = useCallback(async () => {
    await manageSubscription();
    const s = await refreshSubscription();
    setState(s);
  }, []);

  const limits = state ? getLimitsForTier(state.tier) : getLimitsForTier('free');

  return {
    state,
    tier: state?.tier ?? 'free',
    limits,
    offerings,
    loading,
    purchasing,
    error,
    enabled: isSubscriptionsEnabled(),
    subscribe,
    restore,
    manage,
    refresh: async () => setState(await refreshSubscription()),
  };
}