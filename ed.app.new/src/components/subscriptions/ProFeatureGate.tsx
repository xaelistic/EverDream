import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';

interface ProFeatureGateProps {
  feature: string;
  description: string;
  onUpgrade: () => void;
  children: ReactNode;
}

/** Blocks VR / simulacra mesh unless EverDream Pro is active. */
export function ProFeatureGate({ feature, description, onUpgrade, children }: ProFeatureGateProps) {
  const { limits, tier } = useSubscription();

  if (limits.vrSimulacra) {
    return <>{children}</>;
  }

  return (
    <div className="rounded-3xl border border-line bg-gradient-to-br from-parchment to-sage/10 p-8 text-center space-y-4">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-sage/15 flex items-center justify-center">
        <Sparkles className="w-7 h-7 text-sageDark" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">EverDream Pro</p>
        <h2 className="font-serif text-xl text-ink mt-1">{feature}</h2>
        <p className="text-sm text-muted mt-2 max-w-md mx-auto">{description}</p>
      </div>
      <p className="text-xs text-muted">
        Current plan: <span className="font-semibold capitalize text-ink">{tier}</span>
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        className="bg-sage hover:bg-sageDark text-cream px-6 py-3 rounded-2xl font-semibold text-sm"
      >
        Upgrade to Pro
      </button>
    </div>
  );
}