/**
 * $TAO ↔ $XAEL bridge stub — on-chain settlement deferred to ops deploy.
 */

export interface BridgeQuote {
  amountTAO: number;
  amountXAEL: number;
  rate: number;
  feeTAO: number;
  estimatedMinutes: number;
  provider: 'bittensor' | 'simulated';
}

const BRIDGE_ENABLED = import.meta.env.VITE_TAO_BRIDGE_ENABLED === 'true';
const SIMULATED_RATE = Number(import.meta.env.VITE_TAO_XAEL_RATE ?? '42');

export function isBridgeEnabled(): boolean {
  return BRIDGE_ENABLED;
}

/** Returns a quote for TAO → XAEL conversion (simulated until bridge contract is live). */
export async function getTAOToXAELQuote(amountTAO: number): Promise<BridgeQuote | null> {
  if (amountTAO <= 0) return null;

  const feeTAO = amountTAO * 0.005;
  const netTAO = amountTAO - feeTAO;

  return {
    amountTAO,
    amountXAEL: Math.round(netTAO * SIMULATED_RATE * 100) / 100,
    rate: SIMULATED_RATE,
    feeTAO: Math.round(feeTAO * 10000) / 10000,
    estimatedMinutes: BRIDGE_ENABLED ? 15 : 0,
    provider: BRIDGE_ENABLED ? 'bittensor' : 'simulated',
  };
}

/** Placeholder for future on-chain bridge initiation. */
export async function initiateBridge(
  _walletAddress: string,
  amountTAO: number,
): Promise<{ txId: string; status: 'queued' | 'simulated' } | null> {
  const quote = await getTAOToXAELQuote(amountTAO);
  if (!quote) return null;

  if (!BRIDGE_ENABLED) {
    console.log('[taoBridge] Simulated bridge — set VITE_TAO_BRIDGE_ENABLED=true when contract is deployed');
    return { txId: `sim-${Date.now()}`, status: 'simulated' };
  }

  return { txId: `bridge-${Date.now()}`, status: 'queued' };
}