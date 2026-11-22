import { useCallback, useState } from 'react';
import { useAuth } from './use-auth';
import { useToast } from '../components/ui/Toast';
import {
  isCheckoutClosedMessage,
  openStripeCustomerPortal,
  startStripeCheckout,
  startStripeCreditCheckout,
} from '../lib/subscriptions/stripe';
import { getPreferredPaymentChannel } from '../lib/subscriptions/subscriptionService';

export function useBillingCheckout() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutClosed, setCheckoutClosed] = useState(true);
  const signedIn = Boolean(user && !user.isAnonymous);
  const channel = getPreferredPaymentChannel();

  const run = useCallback(
    async (key: string, fn: () => Promise<void>) => {
      if (!signedIn) {
        addToast({ type: 'warning', message: 'Sign in to subscribe or buy credits.' });
        return;
      }
      if (channel === 'none') {
        addToast({ type: 'error', message: 'Payments are not configured on this build.' });
        return;
      }
      setBusy(key);
      try {
        await fn();
        setCheckoutClosed(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment could not start.';
        if (isCheckoutClosedMessage(message)) {
          setCheckoutClosed(true);
          addToast({ type: 'info', message: 'Checkout is closed. Nothing was charged.' });
        } else {
          addToast({ type: 'error', message });
        }
      } finally {
        setBusy(null);
      }
    },
    [addToast, channel, signedIn],
  );

  const buyPlan = (tier: 'plus' | 'pro') =>
    run(tier, () => startStripeCheckout(tier));

  const buyPack = (packId: string) =>
    run(packId, () => startStripeCreditCheckout(packId));

  const openPortal = () => run('portal', openStripeCustomerPortal);

  return { busy, signedIn, checkoutClosed, buyPlan, buyPack, openPortal };
}
