import { useEffect, useState } from 'react';
import { Check, CreditCard, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { useSubscription } from '../hooks/use-subscription';
import { startStripeCheckout, startStripeCreditCheckout, openStripeCustomerPortal, parseSubscriptionReturn, clearSubscriptionReturnParams } from '../lib/subscriptions/stripe';
import { CREDIT_PACKS, getCreditBalance, type CreditBalance } from '../lib/subscriptions/creditService';
import { useToast } from '../components/ui/Toast';

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    credits: '14 starter credits (about two weeks) — no monthly refill',
    features: ['Text, audio and video journals', 'AI dream analysis', 'Phone sleep tracking'],
  },
  {
    id: 'plus' as const,
    name: 'EverDream+',
    price: '$5.99',
    period: 'month',
    credits: '40 image credits / month',
    features: ['Wearable sync', 'Cloud backup', 'PDF export', 'Advanced analysis'],
    popular: true,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$12.99',
    period: 'month',
    credits: '120 image credits / month',
    features: ['VR / simulacra rooms', 'Priority generation', 'API access', 'Everything in Plus'],
  },
];

export function BillingScreen() {
  const { user } = useAuth();
  const { tier, tierLabel, isAdmin, refresh } = useSubscription();
  const { addToast } = useToast();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadBalance = async () => {
    const next = await getCreditBalance();
    setBalance(next);
  };

  useEffect(() => {
    void loadBalance();
    const { status } = parseSubscriptionReturn();
    if (status === 'success') {
      addToast({ type: 'success', message: 'Payment received. Credits and plan update within a minute.' });
      void refresh();
      void loadBalance();
      clearSubscriptionReturnParams();
    } else if (status === 'cancelled') {
      addToast({ type: 'info', message: 'Checkout cancelled.' });
      clearSubscriptionReturnParams();
    }
  }, [refresh, addToast]);

  const signedIn = Boolean(user && !user.isAnonymous);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (!signedIn) {
      addToast({ type: 'warning', message: 'Sign in to subscribe or buy credits.' });
      return;
    }
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Payment could not start.',
      });
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-medium text-ink">Plan & credits</h2>
        <p className="text-sm text-muted mt-1">
          Capture is always free. Images spend credits. Free is a one-time 14-credit starter (about two weeks of nightly images) — it does not refill each month. Plus and Pro monthly credits reset; packs you buy stay until you use them.
        </p>
      </div>

      <section className="rounded-3xl border border-line bg-gradient-to-br from-sage/15 to-parchment p-5 shadow-paper">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Current plan</p>
        <div className="flex items-end justify-between gap-3 mt-1">
          <h3 className="font-serif text-3xl text-ink">{isAdmin ? 'Admin' : tierLabel}</h3>
          <CreditCard className="w-7 h-7 text-duskDeep" />
        </div>
        {balance && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/80 border border-line/60 p-2.5">
              <p className="text-[9px] uppercase text-muted">Available</p>
              <p className="text-lg font-semibold">{isAdmin ? '∞' : balance.totalRemaining}</p>
            </div>
            <div className="rounded-xl bg-white/80 border border-line/60 p-2.5">
              <p className="text-[9px] uppercase text-muted">
                {balance.monthlyAllotment > 0 ? 'This month' : 'Starter left'}
              </p>
              <p className="text-lg font-semibold">
                {balance.monthlyAllotment > 0
                  ? `${balance.monthlyRemaining}/${balance.monthlyAllotment}`
                  : balance.purchasedCredits}
              </p>
            </div>
            <div className="rounded-xl bg-white/80 border border-line/60 p-2.5">
              <p className="text-[9px] uppercase text-muted">Purchased</p>
              <p className="text-lg font-semibold">{balance.purchasedCredits}</p>
            </div>
          </div>
        )}
        {tier !== 'free' && (
          <button
            type="button"
            onClick={() => void run('portal', openStripeCustomerPortal)}
            className="mt-4 text-sm font-medium text-sageDark"
          >
            {busy === 'portal' ? 'Opening…' : 'Manage billing'}
          </button>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">Plans</h3>
        {PLANS.map((plan) => {
          const current = plan.id === tier;
          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-4 ${
                plan.popular ? 'border-sage bg-sage/5' : 'border-line bg-cream'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{plan.name}</p>
                  <p className="text-2xl font-bold text-ink">
                    {plan.price}
                    <span className="text-sm font-normal text-muted">/{plan.period}</span>
                  </p>
                  <p className="text-xs text-sageDark mt-1">{plan.credits}</p>
                </div>
                {plan.popular && (
                  <span className="text-[10px] uppercase tracking-wide bg-sage text-cream px-2 py-1 rounded-full">
                    Popular
                  </span>
                )}
              </div>
              <ul className="mt-3 space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink">
                    <Check className="w-4 h-4 text-sageDark mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.id !== 'free' && !current && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void run(plan.id, () => startStripeCheckout(plan.id))}
                  className="mt-4 w-full rounded-xl bg-sage text-cream font-semibold py-2.5 disabled:opacity-60"
                >
                  {busy === plan.id ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                </button>
              )}
              {current && <p className="mt-3 text-xs font-medium text-sageDark">Your current plan</p>}
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-duskDeep" />
          <h3 className="text-sm font-semibold text-ink">Buy more credits</h3>
        </div>
        <p className="text-xs text-muted">
          Packs never expire. Free starter credits do not come back next month.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.id} className="rounded-2xl border border-line bg-cream p-4">
              <Sparkles className="w-4 h-4 text-duskDeep mb-2" />
              <p className="font-semibold text-ink">{pack.credits} credits</p>
              <p className="text-xl font-bold text-ink mt-1">{pack.price}</p>
              <p className="text-xs text-muted mt-1">{pack.blurb}</p>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void run(pack.id, () => startStripeCreditCheckout(pack.id))}
                className="mt-3 w-full rounded-xl border border-sage/40 text-sageDark font-semibold py-2 text-sm disabled:opacity-60"
              >
                {busy === pack.id ? 'Redirecting…' : 'Buy'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
