import { useEffect, useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { useSubscription } from '../../hooks/use-subscription';
import { getCreditBalance, type CreditBalance } from '../../lib/subscriptions/creditService';

type CreditBalanceCardProps = {
  onTopUp?: () => void;
  onUpgrade?: () => void;
  compact?: boolean;
};

export function CreditBalanceCard({ onTopUp, onUpgrade, compact = false }: CreditBalanceCardProps) {
  const { tierLabel, isAdmin } = useSubscription();
  const [balance, setBalance] = useState<CreditBalance | null>(null);

  useEffect(() => {
    void getCreditBalance().then(setBalance);
  }, []);

  const available = isAdmin ? '∞' : balance ? String(balance.totalRemaining) : '—';
  const showUpgrade = Boolean(onUpgrade) && !isAdmin;

  return (
    <section className="rounded-3xl border border-line bg-gradient-to-br from-sage/15 via-cream to-parchment p-5 shadow-paper">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Tokens</p>
          <p className="font-serif text-4xl text-ink mt-1 leading-none">{available}</p>
          <p className="text-xs text-muted mt-2">
            {isAdmin ? 'Admin — unlimited generation' : `${tierLabel} plan`}
          </p>
        </div>
        <Sparkles className="w-6 h-6 text-duskDeep" strokeWidth={1.5} />
      </div>
      {balance && !isAdmin && !compact && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-white/80 border border-line/60 p-2.5">
            <p className="text-[9px] uppercase text-muted">
              {balance.monthlyAllotment > 0 ? 'This month' : 'Starter'}
            </p>
            <p className="text-sm font-semibold text-ink">
              {balance.monthlyAllotment > 0
                ? `${balance.monthlyRemaining} / ${balance.monthlyAllotment}`
                : balance.purchasedCredits}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 border border-line/60 p-2.5">
            <p className="text-[9px] uppercase text-muted">Packs</p>
            <p className="text-sm font-semibold text-ink">{balance.purchasedCredits}</p>
          </div>
        </div>
      )}
      {(onTopUp || showUpgrade) && (
        <div className={`mt-4 grid gap-2 ${onTopUp && showUpgrade ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {onTopUp && (
            <button
              type="button"
              onClick={onTopUp}
              className="rounded-xl bg-sage text-cream font-semibold py-2.5 text-sm inline-flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              Top up
            </button>
          )}
          {showUpgrade && (
            <button
              type="button"
              onClick={onUpgrade}
              className="rounded-xl border border-sage/40 text-sageDark font-semibold py-2.5 text-sm"
            >
              Upgrade
            </button>
          )}
        </div>
      )}
    </section>
  );
}
