import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useSubscription } from '../hooks/use-subscription';
import { useBillingCheckout } from '../hooks/useBillingCheckout';
import { CreditBalanceCard } from '../components/subscriptions/CreditBalanceCard';
import { parseSubscriptionReturn, clearSubscriptionReturnParams } from '../lib/subscriptions/stripe';
import { useToast } from '../components/ui/Toast';
import { planById } from '../lib/subscriptions/plans';

type BillingScreenProps = {
  onUpgrade?: () => void;
  onTopUp?: () => void;
};

export function BillingScreen({ onUpgrade, onTopUp }: BillingScreenProps) {
  const { tier, isAdmin, refresh } = useSubscription();
  const { busy, openPortal } = useBillingCheckout();
  const { addToast } = useToast();
  const plan = planById(isAdmin ? 'pro' : tier);

  useEffect(() => {
    const { status } = parseSubscriptionReturn();
    if (status === 'success') {
      addToast({ type: 'success', message: 'Payment received. Plan and credits update within a minute.' });
      void refresh();
      clearSubscriptionReturnParams();
    } else if (status === 'cancelled') {
      addToast({ type: 'info', message: 'Checkout cancelled.' });
      clearSubscriptionReturnParams();
    }
  }, [addToast, refresh]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-medium text-ink">Plan & tokens</h2>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Capture is free. Images, storyboards and clips spend tokens. Free is a one-time starter pack —
          Plus and Pro refill each month.
        </p>
      </div>

      <CreditBalanceCard onTopUp={onTopUp} onUpgrade={onUpgrade} />

      <section className="rounded-3xl border border-line bg-cream p-5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Current plan</p>
        <h3 className="font-serif text-3xl text-ink mt-1">{isAdmin ? 'Admin' : plan.name}</h3>
        <p className="text-sm text-ink/80 mt-2 leading-relaxed">{plan.blurb}</p>
        <p className="text-xs text-sageDark mt-2">{plan.credits}</p>
        <div className="mt-4 flex flex-col gap-2">
          {onUpgrade && (
            <button
              type="button"
              onClick={onUpgrade}
              className="w-full rounded-xl bg-sage text-cream font-semibold py-3 inline-flex items-center justify-center gap-2"
            >
              See plans & unlock
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {tier !== 'free' && (
            <button
              type="button"
              onClick={() => void openPortal()}
              className="text-sm font-medium text-sageDark"
            >
              {busy === 'portal' ? 'Opening…' : 'Manage billing'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
