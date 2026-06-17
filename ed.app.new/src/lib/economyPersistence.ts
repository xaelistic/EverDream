/**
 * Sync local XAEL economy + NFT marketplace state to Supabase when configured.
 */

import { supabase } from './supabase/client';
import { getProfileIdForAssets, isSupabaseAssetsEnabled } from './assets/assetPersistence';
import {
  getBalances,
  saveBalances,
  listOrders,
  listTrades,
  type WalletBalances,
  type ExchangeOrder,
  type TradeRecord,
} from './xaelEconomy';
import { listNFTListings, type NFTListing } from './nftMarketplace';

export function isEconomySyncEnabled(): boolean {
  return isSupabaseAssetsEnabled();
}

export async function syncEconomyToSupabase(): Promise<void> {
  if (!isEconomySyncEnabled()) return;

  const userId = await getProfileIdForAssets();
  if (!userId) return;

  const balances = getBalances();
  const commodities = Object.keys(balances) as (keyof WalletBalances)[];

  for (const commodity of commodities) {
    const { error } = await supabase.from('economy_balances').upsert(
      {
        user_id: userId,
        commodity,
        amount: balances[commodity],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,commodity' },
    );
    if (error) console.warn('[economyPersistence] balance upsert:', error.message);
  }

  const orders = listOrders();
  for (const order of orders) {
    const { error } = await supabase.from('exchange_orders').upsert(
      {
        user_id: userId,
        local_id: order.id,
        commodity: order.commodity,
        side: order.side,
        amount: order.amount,
        price_per_unit: order.pricePerUnit,
        seller_id: order.sellerId,
        dream_id: order.dreamId ?? null,
        nft_id: order.nftId ?? null,
        status: order.status,
        created_at: order.createdAt,
      },
      { onConflict: 'user_id,local_id' },
    );
    if (error) console.warn('[economyPersistence] order upsert:', error.message);
  }

  const trades = listTrades();
  for (const trade of trades) {
    const { error } = await supabase.from('exchange_trades').upsert(
      {
        user_id: userId,
        local_id: trade.id,
        commodity: trade.commodity,
        amount: trade.amount,
        price: trade.price,
        buyer_id: trade.buyerId,
        seller_id: trade.sellerId,
        traded_at: trade.timestamp,
      },
      { onConflict: 'user_id,local_id' },
    );
    if (error) console.warn('[economyPersistence] trade upsert:', error.message);
  }

  const listings = listNFTListings();
  for (const listing of listings) {
    const { error } = await supabase.from('nft_market_listings').upsert(
      {
        user_id: userId,
        local_id: listing.id,
        nft_id: listing.nftId,
        dream_id: listing.dreamId,
        seller_wallet: listing.sellerWallet,
        price_xael: listing.priceXAEL,
        title: listing.title,
        description: listing.description,
        image_url: listing.imageUrl ?? null,
        animation_url: listing.animationUrl ?? null,
        commodities: listing.commodities ?? null,
        status: listing.status,
        created_at: listing.createdAt,
        sold_at: listing.soldAt ?? null,
        buyer_wallet: listing.buyerWallet ?? null,
      },
      { onConflict: 'user_id,local_id' },
    );
    if (error) console.warn('[economyPersistence] listing upsert:', error.message);
  }
}

export async function loadEconomyFromSupabase(): Promise<boolean> {
  if (!isEconomySyncEnabled()) return false;

  const userId = await getProfileIdForAssets();
  if (!userId) return false;

  const { data: balanceRows, error: balErr } = await supabase
    .from('economy_balances')
    .select('commodity, amount')
    .eq('user_id', userId);

  if (balErr) {
    console.warn('[economyPersistence] load balances:', balErr.message);
    return false;
  }

  if (balanceRows && balanceRows.length > 0) {
    const local = getBalances();
    const merged = { ...local };
    for (const row of balanceRows) {
      const key = row.commodity as keyof WalletBalances;
      if (key in merged) {
        merged[key] = Math.max(merged[key], Number(row.amount));
      }
    }
    saveBalances(merged);
  }

  const { data: orderRows } = await supabase
    .from('exchange_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (orderRows && orderRows.length > 0) {
    const localOrders = listOrders();
    const byId = new Map(localOrders.map((o) => [o.id, o]));
    for (const row of orderRows) {
      const mapped: ExchangeOrder = {
        id: row.local_id,
        commodity: row.commodity,
        side: row.side,
        amount: Number(row.amount),
        pricePerUnit: Number(row.price_per_unit),
        sellerId: row.seller_id,
        dreamId: row.dream_id ?? undefined,
        nftId: row.nft_id ?? undefined,
        createdAt: row.created_at,
        status: row.status,
      };
      if (!byId.has(mapped.id)) byId.set(mapped.id, mapped);
    }
    localStorage.setItem('everdream_exchange_orders', JSON.stringify([...byId.values()]));
  }

  const { data: tradeRows } = await supabase
    .from('exchange_trades')
    .select('*')
    .eq('user_id', userId)
    .order('traded_at', { ascending: false });

  if (tradeRows && tradeRows.length > 0) {
    const localTrades = listTrades();
    const byId = new Map(localTrades.map((t) => [t.id, t]));
    for (const row of tradeRows) {
      const mapped: TradeRecord = {
        id: row.local_id,
        commodity: row.commodity,
        amount: Number(row.amount),
        price: Number(row.price),
        buyerId: row.buyer_id,
        sellerId: row.seller_id,
        timestamp: row.traded_at,
      };
      if (!byId.has(mapped.id)) byId.set(mapped.id, mapped);
    }
    localStorage.setItem('everdream_exchange_trades', JSON.stringify([...byId.values()]));
  }

  const { data: listingRows } = await supabase
    .from('nft_market_listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (listingRows && listingRows.length > 0) {
    const localListings = listNFTListings();
    const byId = new Map(localListings.map((l) => [l.id, l]));
    for (const row of listingRows) {
      const mapped: NFTListing = {
        id: row.local_id,
        nftId: row.nft_id,
        dreamId: row.dream_id,
        sellerWallet: row.seller_wallet,
        priceXAEL: Number(row.price_xael),
        title: row.title,
        description: row.description ?? '',
        imageUrl: row.image_url ?? undefined,
        animationUrl: row.animation_url ?? undefined,
        commodities: row.commodities ?? undefined,
        status: row.status,
        createdAt: row.created_at,
        soldAt: row.sold_at ?? undefined,
        buyerWallet: row.buyer_wallet ?? undefined,
      };
      if (!byId.has(mapped.id)) byId.set(mapped.id, mapped);
    }
    localStorage.setItem('everdream_nft_listings', JSON.stringify([...byId.values()]));
  }

  return true;
}