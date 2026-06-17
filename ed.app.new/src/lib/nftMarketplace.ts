/**
 * NFT Marketplace — list, buy, and trade dream NFTs for XAEL.
 * Local-first; syncs to Supabase when available.
 */

import type { DreamNFT } from './nft';
import { placeOrder, executeTrade, listOrders, type Commodity } from './xaelEconomy';
import { notifyExchangeTrade, notifyNFTMinted } from './discord';

export interface NFTListing {
  id: string;
  nftId: string;
  dreamId: string;
  sellerWallet: string;
  priceXAEL: number;
  title: string;
  description: string;
  imageUrl?: string;
  animationUrl?: string; // GLB / VR asset
  commodities?: Partial<Record<Commodity, number>>;
  status: 'active' | 'sold' | 'cancelled';
  createdAt: string;
  soldAt?: string;
  buyerWallet?: string;
}

const LISTINGS_KEY = 'everdream_nft_listings';

export function listNFTListings(): NFTListing[] {
  try {
    const raw = localStorage.getItem(LISTINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveListings(listings: NFTListing[]): void {
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
  import('./economyPersistence').then(({ syncEconomyToSupabase }) => {
    syncEconomyToSupabase().catch(() => {});
  });
}

export function createListingFromNFT(
  nft: DreamNFT,
  priceXAEL: number,
  extras?: { animationUrl?: string },
): NFTListing {
  const listing: NFTListing = {
    id: crypto.randomUUID(),
    nftId: nft.id,
    dreamId: nft.dreamId,
    sellerWallet: nft.owner,
    priceXAEL,
    title: nft.metadata.name,
    description: nft.metadata.description,
    imageUrl: nft.metadata.image,
    animationUrl: extras?.animationUrl ?? nft.metadata.animation_url,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  const listings = listNFTListings();
  listings.unshift(listing);
  saveListings(listings);

  placeOrder({
    commodity: 'XAEL',
    side: 'sell',
    amount: 1,
    pricePerUnit: priceXAEL,
    sellerId: nft.owner,
    dreamId: nft.dreamId,
    nftId: nft.id,
  });

  return listing;
}

export async function buyListing(
  listingId: string,
  buyerWallet: string,
): Promise<NFTListing | null> {
  const listings = listNFTListings();
  const idx = listings.findIndex((l) => l.id === listingId && l.status === 'active');
  if (idx < 0) return null;

  const listing = listings[idx];
  const order = listOrders().find((o) => o.nftId === listing.nftId && o.status === 'open');
  if (order) executeTrade(order.id, buyerWallet);

  listings[idx] = {
    ...listing,
    status: 'sold',
    soldAt: new Date().toISOString(),
    buyerWallet,
  };
  saveListings(listings);

  await notifyExchangeTrade('XAEL', 1, listing.priceXAEL);
  await notifyNFTMinted(listing.title, listing.nftId, buyerWallet, listing.imageUrl);

  return listings[idx];
}

/** Bundle listing with energy/data/compute commodities. */
export function createResourceBundleListing(
  nft: DreamNFT,
  priceXAEL: number,
  bundle: Partial<Record<Commodity, number>>,
): NFTListing {
  const listing = createListingFromNFT(nft, priceXAEL);
  listing.commodities = bundle;
  const listings = listNFTListings();
  const idx = listings.findIndex((l) => l.id === listing.id);
  if (idx >= 0) {
    listings[idx] = listing;
    saveListings(listings);
  }
  return listing;
}