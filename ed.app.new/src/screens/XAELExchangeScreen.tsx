import { useEffect, useState } from 'react';
import { ArrowLeft, Zap, Database, Cpu, Sparkles, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import {
  getBalances,
  listOrders,
  listTrades,
  executeTrade,
  seedDemoOrders,
  placeSellOrder,
  type WalletBalances,
  type ExchangeOrder,
  type Commodity,
} from '../lib/xaelEconomy';
import { listNFTListings, buyListing } from '../lib/nftMarketplace';
import type { NFTListing } from '../lib/nftMarketplace';
import { getSpotPrices } from '../lib/xaelOracle';
import { getTAOToXAELQuote, isBridgeEnabled } from '../lib/taoBridge';
import { loadEconomyFromSupabase } from '../lib/economyPersistence';

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
  const [tab, setTab] = useState<'market' | 'nfts' | 'history' | 'sell'>('market');
  const [sellCommodity, setSellCommodity] = useState<Commodity>('ENERGY');
  const [sellAmount, setSellAmount] = useState('10');
  const [sellPrice, setSellPrice] = useState('2.5');
  const [bridgeTAO, setBridgeTAO] = useState('1');
  const [bridgeQuote, setBridgeQuote] = useState<string | null>(null);

  useEffect(() => {
    loadEconomyFromSupabase().finally(() => {
      seedDemoOrders();
      refresh();
    });
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

  const handlePlaceSell = () => {
    const amount = Number(sellAmount);
    const price = Number(sellPrice);
    if (!Number.isFinite(amount) || !Number.isFinite(price)) return;
    placeSellOrder(sellCommodity, amount, price, walletAddress);
    refresh();
    setTab('market');
  };

  const handleBridgePreview = async () => {
    const amount = Number(bridgeTAO);
    const quote = await getTAOToXAELQuote(amount);
    if (quote) {
      setBridgeQuote(
        `${quote.amountTAO} TAO → ${quote.amountXAEL} XAEL @ ${quote.rate} (${quote.provider}${isBridgeEnabled() ? ', ~' + quote.estimatedMinutes + ' min' : ''})`,
      );
    }
  };

  const spots = getSpotPrices();

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

        <div className="grid grid-cols-3 gap-2 mt-4">
          {spots.map((s) => {
            const meta = COMMODITY_META[s.commodity];
            const Icon = meta.icon;
            const up = s.change24h >= 0;
            return (
              <div key={s.commodity} className="rounded-xl bg-cream/80 border border-line px-3 py-2">
                <div className="flex items-center gap-1 text-[10px] text-muted uppercase">
                  <Icon className={`w-3 h-3 ${meta.color}`} /> {s.commodity}
                </div>
                <div className="text-sm font-semibold text-ink">{s.priceXAEL} XAEL</div>
                <div className={`text-[10px] flex items-center gap-0.5 ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {up ? '+' : ''}{s.change24h}%
                </div>
              </div>
            );
          })}
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

      <div className="flex flex-wrap gap-2">
        {(['market', 'nfts', 'sell', 'history'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
              tab === t ? 'bg-sage text-cream' : 'bg-parchment text-muted'
            }`}
          >
            {t === 'sell' ? 'Place order' : t}
          </button>
        ))}
        <button
          type="button"
          onClick={() => navigate('combine')}
          className="px-4 py-2 rounded-full text-sm font-medium bg-dusk/10 text-duskDeep border border-dusk/20"
        >
          Combine dreams
        </button>
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
                      <div className="text-xs text-muted">{o.pricePerUnit} XAEL / unit · {o.side}</div>
                    </div>
                  </div>
                  {o.side === 'sell' && (
                    <button
                      type="button"
                      onClick={() => handleBuyOrder(o.id)}
                      className="bg-sage hover:bg-sageDark text-cream px-4 py-2 rounded-xl text-sm font-semibold"
                    >
                      Buy
                    </button>
                  )}
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
                  {l.commodities && Object.keys(l.commodities).length > 0 && (
                    <div className="text-[10px] text-muted mt-1 flex flex-wrap gap-1">
                      {Object.entries(l.commodities).map(([k, v]) => (
                        <span key={k} className="bg-parchment px-1.5 py-0.5 rounded">
                          +{v} {k}
                        </span>
                      ))}
                    </div>
                  )}
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

      {tab === 'sell' && (
        <div className="rounded-2xl border border-line bg-cream p-4 space-y-4">
          <h3 className="font-medium text-ink flex items-center gap-2">
            <Plus className="w-4 h-4" /> List a sell order
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-sm">
              Commodity
              <select
                value={sellCommodity}
                onChange={(e) => setSellCommodity(e.target.value as Commodity)}
                className="mt-1 w-full rounded-xl border border-line bg-parchment px-3 py-2"
              >
                {(['ENERGY', 'DATA', 'COMPUTE', 'XAEL'] as Commodity[]).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Amount
              <input
                type="number"
                min="1"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-parchment px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Price (XAEL / unit)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-parchment px-3 py-2"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handlePlaceSell}
            className="bg-sage text-cream px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            Place sell order
          </button>

          <div className="border-t border-line pt-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted">TAO bridge {isBridgeEnabled() ? '(live)' : '(preview)'}</p>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={bridgeTAO}
                onChange={(e) => setBridgeTAO(e.target.value)}
                className="flex-1 rounded-xl border border-line bg-parchment px-3 py-2 text-sm"
                placeholder="TAO amount"
              />
              <button
                type="button"
                onClick={handleBridgePreview}
                className="border border-line bg-parchment px-4 py-2 rounded-xl text-sm font-medium"
              >
                Quote
              </button>
            </div>
            {bridgeQuote && <p className="text-xs text-muted">{bridgeQuote}</p>}
          </div>
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