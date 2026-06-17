/**
 * XAEL Economy — trade experience (XAEL) alongside energy, data & compute.
 * Local-first ledger; designed for future on-chain settlement.
 */

import { calculateDXPScore, calculateXAELScore, type XAELData } from '../utils/xael';

export type Commodity = 'XAEL' | 'ENERGY' | 'DATA' | 'COMPUTE';

export interface WalletBalances {
  XAEL: number;
  ENERGY: number;
  DATA: number;
  COMPUTE: number;
}

export interface ExchangeOrder {
  id: string;
  commodity: Commodity;
  side: 'buy' | 'sell';
  amount: number;
  pricePerUnit: number; // in XAEL for ENERGY/DATA/COMPUTE; USD-equiv for XAEL listings
  sellerId: string;
  dreamId?: string;
  nftId?: string;
  createdAt: string;
  status: 'open' | 'filled' | 'cancelled';
}

export interface TradeRecord {
  id: string;
  commodity: Commodity;
  amount: number;
  price: number;
  buyerId: string;
  sellerId: string;
  timestamp: string;
}

const BALANCE_KEY = 'everdream_xael_balances';
const ORDERS_KEY = 'everdream_exchange_orders';
const TRADES_KEY = 'everdream_exchange_trades';

const DEFAULT_BALANCES: WalletBalances = {
  XAEL: 100,
  ENERGY: 50,
  DATA: 200,
  COMPUTE: 25,
};

export function getBalances(): WalletBalances {
  try {
    const raw = localStorage.getItem(BALANCE_KEY);
    return raw ? { ...DEFAULT_BALANCES, ...JSON.parse(raw) } : { ...DEFAULT_BALANCES };
  } catch {
    return { ...DEFAULT_BALANCES };
  }
}

export function saveBalances(b: WalletBalances): void {
  localStorage.setItem(BALANCE_KEY, JSON.stringify(b));
}

/** Mint XAEL from dream XAEL data after journaling. */
export function mintXAELFromDream(xael: XAELData): number {
  const dxp = calculateDXPScore(xael);
  const xaelScore = calculateXAELScore(xael);
  const minted = Math.round(xaelScore * 0.5 + dxp * 0.05);
  const b = getBalances();
  b.XAEL += minted;
  saveBalances(b);
  return minted;
}

/** Estimate XAEL listing price for a dream NFT. */
export function estimateDreamXAELValue(xael: Partial<XAELData>, rarity = 1): number {
  if (!xael.structure || !xael.emotion) return 10 * rarity;
  const full = xael as XAELData;
  const score = calculateXAELScore(full);
  return Math.max(5, Math.round(score * rarity));
}

export function listOrders(): ExchangeOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function placeOrder(
  order: Omit<ExchangeOrder, 'id' | 'createdAt' | 'status'>,
): ExchangeOrder {
  const full: ExchangeOrder = {
    ...order,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'open',
  };
  const orders = listOrders();
  orders.unshift(full);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  return full;
}

/** Simulated instant match for MVP — deducts seller balance, credits buyer. */
export function executeTrade(orderId: string, buyerId: string): TradeRecord | null {
  const orders = listOrders();
  const idx = orders.findIndex((o) => o.id === orderId && o.status === 'open');
  if (idx < 0) return null;

  const order = orders[idx];
  const total = order.amount * order.pricePerUnit;
  const buyer = getBalances();
  const seller = getBalances();

  if (order.side === 'sell') {
    if (buyer[order.commodity] < 0 && order.commodity !== 'XAEL') return null;
    if (buyer.XAEL < total) return null;
    buyer.XAEL -= total;
    buyer[order.commodity] += order.amount;
    seller.XAEL += total;
    if (seller[order.commodity] >= order.amount) seller[order.commodity] -= order.amount;
  }

  saveBalances(buyer);
  orders[idx] = { ...order, status: 'filled' };
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

  const trade: TradeRecord = {
    id: crypto.randomUUID(),
    commodity: order.commodity,
    amount: order.amount,
    price: total,
    buyerId,
    sellerId: order.sellerId,
    timestamp: new Date().toISOString(),
  };
  const trades = listTrades();
  trades.unshift(trade);
  localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
  return trade;
}

export function listTrades(): TradeRecord[] {
  try {
    const raw = localStorage.getItem(TRADES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Seed demo marketplace orders. */
export function seedDemoOrders(): void {
  if (listOrders().length > 0) return;
  const demos: Omit<ExchangeOrder, 'id' | 'createdAt' | 'status'>[] = [
    { commodity: 'ENERGY', side: 'sell', amount: 10, pricePerUnit: 2.5, sellerId: 'grid-madagascar' },
    { commodity: 'COMPUTE', side: 'sell', amount: 5, pricePerUnit: 8, sellerId: 'relativistic-node-1' },
    { commodity: 'DATA', side: 'sell', amount: 100, pricePerUnit: 0.15, sellerId: 'dream-basket-alpha' },
    { commodity: 'XAEL', side: 'sell', amount: 50, pricePerUnit: 1, sellerId: 'luna-dreamer', dreamId: 'demo-luna-1' },
  ];
  demos.forEach(placeOrder);
}