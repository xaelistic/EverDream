import { ArrowLeft, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useSubscription } from '../hooks/use-subscription';
import { useBillingCheckout } from '../hooks/useBillingCheckout';
import { CREDIT_PACKS } from '../lib/subscriptions/plans';
import { CreditBalanceCard } from '../components/subscriptions/CreditBalanceCard';
import {
  parseSubscriptionReturn,
  clearSubscriptionReturnParams,
  captureCheckoutIntent,
  clearCheckoutIntent,
  readCheckoutIntent,
} from '../lib/subscriptions/stripe';
import { useToast } from '../components/ui/Toast';

type CreditsScreenProps = {
  onBack?: () => void;
  onUpgrade?: () => void;
};

export function CreditsScreen({ onBack, onUpgrade }: CreditsScreenProps) {
  const { refresh } = useSubscription();
  const { busy, buyPack, signedIn } = useBillingCheckout();
  const { addToast } = useToast();
  const intentFired = useRef(false);

  useEffect(() => {
    captureCheckoutIntent();
  }, []);

  useEffect(() => {
    if (intentFired.current || !signedIn) return;
    const { pack } = readCheckoutIntent();
    if (pack && CREDIT_PACKS.some((row) => row.id === pack)) {
      intentFired.current = true;
      clearCheckoutIntent();
      void buyPack(pack);
    }
  }, [buyPack, signedIn]);

  useEffect(() => {
    const { status } = parseSubscriptionReturn();
    if (status === 'success') {
      addToast({ type: 'success', message: 'Payment received. Credits update within a minute.' });
      void refresh();
      clearSubscriptionReturnParams();
    } else if (status === 'cancelled') {
      addToast({ type: 'info', message: 'Checkout cancelled.' });
      clearSubscriptionReturnParams();
    }
  }, [addToast, refresh]);

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-duskDeep font-semibold">Tokens</p>
        <h2 className="font-serif text-3xl text-ink mt-1">Top up credits</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          One credit paints one image. Storyboards use one credit per scene. Packs never expire and sit
          on top of any monthly allotment.
        </p>
        {!signedIn && (
          <p className="text-sm text-duskDeep mt-3">Sign in to buy credits with Stripe.</p>
        )}
      </div>

      <CreditBalanceCard onUpgrade={onUpgrade} />

      <section className="grid gap-3">
        {CREDIT_PACKS.map((pack) => (
          <article key={pack.id} className="rounded-3xl border border-line bg-cream p-5 shadow-paper">
            <Sparkles className="w-5 h-5 text-duskDeep" />
            <p className="font-serif text-2xl text-ink mt-2">{pack.credits} credits</p>
            <p className="text-xl font-bold text-ink mt-1">{pack.price}</p>
            <p className="text-sm text-muted mt-1">{pack.blurb}</p>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void buyPack(pack.id)}
              className="mt-4 w-full rounded-xl bg-sage text-cream font-semibold py-3 disabled:opacity-60"
            >
              {busy === pack.id ? 'Redirecting…' : `Buy ${pack.credits} credits`}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
