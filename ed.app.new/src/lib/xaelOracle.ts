/**
 * Spot-price oracle for ENERGY, DATA, and COMPUTE commodities.
 * Local-first: derives prices from open exchange orders with seeded fallbacks.
 */

import { listOrders, type Commodity } from './xaelEconomy';

export interface SpotPrice {
  commodity: Commodity;
  priceXAEL: number;
  change24h: number;
  volume24h: number;
  updatedAt: string;
}

const BASE_PRICES: Record<Exclude<Commodity, 'XAEL'>, number> = {
  ENERGY: 2.4,
  DATA: 0.12,
  COMPUTE: 7.5,
};

const SEED_CHANGE: Record<Exclude<Commodity, 'XAEL'>, number> = {
  ENERGY: 1.8,
  DATA: -0.6,
  COMPUTE: 3.2,
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Compute spot prices from the order book (sell-side mid) with static fallbacks. */
export function getSpotPrices(): SpotPrice[] {
  const orders = listOrders().filter((o) => o.status === 'open' && o.side === 'sell');
  const now = new Date().toISOString();

  return (['ENERGY', 'DATA', 'COMPUTE'] as const).map((commodity) => {
    const book = orders.filter((o) => o.commodity === commodity).map((o) => o.pricePerUnit);
    const priceXAEL = book.length > 0 ? median(book) : BASE_PRICES[commodity];
    return {
      commodity,
      priceXAEL: Math.round(priceXAEL * 100) / 100,
      change24h: SEED_CHANGE[commodity],
      volume24h: book.reduce((sum, _p, i) => sum + (orders.filter((o) => o.commodity === commodity)[i]?.amount ?? 0), 0) || 10,
      updatedAt: now,
    };
  });
}

export function getSpotPrice(commodity: Commodity): number {
  if (commodity === 'XAEL') return 1;
  const spot = getSpotPrices().find((p) => p.commodity === commodity);
  return spot?.priceXAEL ?? BASE_PRICES[commodity];
}

/** Suggested listing floor for dream NFTs from XAEL score. */
export function oracleFloorFromScore(xaelScore: number, rarity = 1): number {
  const energySpot = getSpotPrice('ENERGY');
  return Math.max(5, Math.round(xaelScore * rarity * 0.1 + energySpot));
}