import { useEffect, useState } from 'react';
import { ArrowLeft, Zap, Database, Cpu, Sparkles, TrendingUp } from 'lucide-react';
import {
  getBalances,
  listOrders,
  listTrades,
  executeTrade,
  seedDemoOrders,
  type WalletBalances,
  type ExchangeOrder,
  type Commodity,
} from '../lib/xaelEconomy';
import { listNFTListings, buyListing } from '../lib/nftMarketplace';
import type { NFTListing } from '../lib/nftMarketplace';

interface XAELExchangeScreenProps {
  navigate: (screen: string) => void;
  walletAddress?: string;
}

const COMMODITY_META: Record<Commodity, { label: string; icon: typeof Zap; color: string }> = {
  XAEL: { label: 'XAEL (Qualia)', icon: Sparkles, color: 'text-sageDark' },
  ENERGY: { label: 'Energy', icon: Zap, color: 'text-amber-600' },
  DATA: { label: 'Data', icon: Database, color: 'text-blue-600' },
  COMPUTE: { label: 'Compute', icon: Cpu, color: 'text-purple-600' },
};

export function XAELExchangeScreen({ navigate, walletAddress = 'local-wallet' }: XAELExchangeScreenProps) {
  const [balances, setBalances] = useState<WalletBalances>(getBalances());
  const [orders, setOrders] = useState<ExchangeOrder[]>([]);
  const [listings, setListings] = useState<NFTListing[]>([]);
  const [tab, setTab] = useState<'market' | 'nfts' | 'history'>('market');

  useEffect(() => {
    seedDemoOrders();
    refresh();
  }, []);

  const refresh = () => {
    setBalances(getBalances());
    setOrders(listOrders().filter((o) => o.status === 'open'));
    setListings(listNFTListings().filter((l) => l.status === 'active'));
  };

  const handleBuyOrder = (orderId: string) => {
    executeTrade(orderId, walletAddress);
    refresh();
  };

  const handleBuyNFT = (listingId: string) => {
    buyListing(listingId, walletAddress);
    refresh();
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('assets')}
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" /> Assets
      </button>

      <div className="rounded-3xl border border-line bg-gradient-to-br from-sage/15 to-cream p-6 shadow-lift">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">XAEL Exchange</p>
        <div className="flex flex-wrap items-start justify-between gap-2 mt-1">
          <h2 className="font-serif text-2xl text-ink">Trade experience, energy & compute</h2>
          <a
            href="https://exchange.everdream.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-sageDark border border-sage/30 bg-sage/10 px-3 py-1.5 rounded-full hover:bg-sage/20"
          >
            Open exchange site ↗
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {(Object.keys(COMMODITY_META) as Commodity[]).map((c) => {
            const meta = COMMODITY_META[c];
            const Icon = meta.icon;
            return (
              <div key={c} className="rounded-2xl bg-cream/80 border border-line p-3">
                <Icon className={`w-4 h-4 ${meta.color} mb-1`} />
                <div className="text-lg font-semibold text-ink">{balances[c].toFixed(c === 'XAEL' ? 1 : 0)}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted">{meta.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        {(['market', 'nfts', 'history'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
              tab === t ? 'bg-sage text-cream' : 'bg-parchment text-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'market' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">No open orders</p>
          ) : (
            orders.map((o) => {
              const meta = COMMODITY_META[o.commodity];
              const Icon = meta.icon;
              return (
                <div key={o.id} className="rounded-2xl border border-line bg-cream p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                    <div>
                      <div className="font-medium text-ink">
                        {o.amount} {o.commodity}
                      </div>
                      <div className="text-xs text-muted">{o.pricePerUnit} XAEL / unit</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuyOrder(o.id)}
                    className="bg-sage hover:bg-sageDark text-cream px-4 py-2 rounded-xl text-sm font-semibold"
                  >
                    Buy
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'nfts' && (
        <div className="space-y-3">
          {listings.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              No dream NFTs listed. Mint a dream and list it from the simulacrum screen.
            </p>
          ) : (
            listings.map((l) => (
              <div key={l.id} className="rounded-2xl border border-line bg-cream p-4 flex gap-4">
                {l.imageUrl && (
                  <img src={l.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink truncate">{l.title}</div>
                  <div className="text-xs text-muted flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" /> {l.priceXAEL} XAEL
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleBuyNFT(l.id)}
                  className="self-center bg-sage text-cream px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  Buy NFT
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {listTrades().slice(0, 20).map((t) => (
            <div key={t.id} className="text-sm text-muted border-b border-line pb-2">
              {t.amount} {t.commodity} · {t.price} XAEL · {new Date(t.timestamp).toLocaleString()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}