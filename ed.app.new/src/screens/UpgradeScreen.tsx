import { ArrowLeft, Check, Minus } from 'lucide-react';
import { useSubscription } from '../hooks/use-subscription';
import { useBillingCheckout } from '../hooks/useBillingCheckout';
import { PLAN_COMPARE, PLANS } from '../lib/subscriptions/plans';
import { CreditBalanceCard } from '../components/subscriptions/CreditBalanceCard';

type UpgradeScreenProps = {
  onBack?: () => void;
  onTopUp?: () => void;
};

export function UpgradeScreen({ onBack, onTopUp }: UpgradeScreenProps) {
  const { tier, isAdmin } = useSubscription();
  const { busy, buyPlan, openPortal } = useBillingCheckout();
  const current = isAdmin ? 'pro' : tier;

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
        <p className="text-[10px] uppercase tracking-[0.22em] text-duskDeep font-semibold">Plans</p>
        <h2 className="font-serif text-3xl text-ink mt-1">Choose how you generate</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          Journals, analysis, and sleep tracking are free. Credits are spent when you paint an image,
          storyboard, or motion clip. Monthly credits reset; packs you buy stay until you use them.
        </p>
      </div>

      <CreditBalanceCard compact onTopUp={onTopUp} />

      <div className="space-y-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === current;
          return (
            <article
              key={plan.id}
              className={`rounded-3xl border p-5 ${
                plan.id === 'plus' ? 'border-sage bg-sage/5 shadow-paper' : 'border-line bg-cream'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-2xl text-ink">{plan.name}</h3>
                  <p className="text-2xl font-bold text-ink mt-1">
                    {plan.price}
                    <span className="text-sm font-normal text-muted">/{plan.period}</span>
                  </p>
                </div>
                {plan.id === 'plus' && (
                  <span className="text-[10px] uppercase tracking-wide bg-sage text-cream px-2 py-1 rounded-full">
                    Popular
                  </span>
                )}
              </div>
              <p className="text-sm text-ink/80 mt-3 leading-relaxed">{plan.blurb}</p>
              <p className="text-xs font-medium text-sageDark mt-2">{plan.credits}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-ink">
                    <Check className="w-4 h-4 text-sageDark mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.id !== 'free' && !isCurrent && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void buyPlan(plan.id)}
                  className="mt-5 w-full rounded-xl bg-sage text-cream font-semibold py-3 disabled:opacity-60"
                >
                  {busy === plan.id ? 'Redirecting…' : `Unlock ${plan.name}`}
                </button>
              )}
              {isCurrent && (
                <p className="mt-4 text-sm font-medium text-sageDark">Your current plan</p>
              )}
            </article>
          );
        })}
      </div>

      <section className="rounded-3xl border border-line bg-cream p-4 overflow-x-auto">
        <h3 className="font-serif text-lg text-ink mb-3">Side by side</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-muted">
              <th className="pb-2 pr-2 font-medium"> </th>
              <th className="pb-2 px-1 font-medium">Free</th>
              <th className="pb-2 px-1 font-medium">Plus</th>
              <th className="pb-2 px-1 font-medium">Pro</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_COMPARE.map((row) => (
              <tr key={row.label} className="border-t border-line/80">
                <td className="py-2.5 pr-2 text-ink">{row.label}</td>
                <CompareCell value={row.free} />
                <CompareCell value={row.plus} />
                <CompareCell value={row.pro} />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {tier !== 'free' && (
        <button type="button" onClick={() => void openPortal()} className="text-sm font-medium text-sageDark">
          {busy === 'portal' ? 'Opening…' : 'Manage billing'}
        </button>
      )}
    </div>
  );
}

function CompareCell({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <td className="py-2.5 px-1 text-sageDark">
        <Check className="w-4 h-4" />
      </td>
    );
  }
  if (value === false) {
    return (
      <td className="py-2.5 px-1 text-muted/50">
        <Minus className="w-4 h-4" />
      </td>
    );
  }
  return <td className="py-2.5 px-1 text-xs text-ink">{value}</td>;
}
