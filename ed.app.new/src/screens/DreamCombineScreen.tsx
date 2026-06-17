import { useMemo, useState } from 'react';
import { ArrowLeft, Layers, Loader2, Sparkles } from 'lucide-react';
import { getOrCreateWallet, getWalletNFTs, createCombinedNFT, saveNFT, mintNFT, type DreamNFT } from '../lib/nft';
import { createListingFromNFT } from '../lib/nftMarketplace';
import { notifyNFTMinted } from '../lib/discord';
import { estimateDreamXAELValue } from '../lib/xaelEconomy';
import { dreamToXAELData } from '../lib/dreamToXAEL';

interface DreamCombineScreenProps {
  navigate: (screen: string, id?: string) => void;
}

export function DreamCombineScreen({ navigate }: DreamCombineScreenProps) {
  const wallet = useMemo(() => getOrCreateWallet(), []);
  const eligible = useMemo(
    () => getWalletNFTs(wallet.address).filter((n) => n.status === 'minted' || n.status === 'pending'),
    [wallet.address],
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [narrative, setNarrative] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev,
    );
  };

  const parents = eligible.filter((n) => selected.includes(n.id));

  const handleCombine = async () => {
    if (parents.length < 2) {
      setError('Select at least two parent dream NFTs.');
      return;
    }
    if (!title.trim()) {
      setError('Give your combined dream a title.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const themes = [...new Set(parents.flatMap((p) =>
        p.metadata.attributes
          .filter((a) => a.trait_type === 'Themes' || a.trait_type === 'Theme')
          .map((a) => String(a.value)),
      ))].filter(Boolean);

      const combined = createCombinedNFT(
        parents,
        {
          title: title.trim(),
          narrative: narrative.trim() || `A fusion of ${parents.length} dream experiences.`,
          themes: themes.length ? themes : ['fusion', 'remix'],
          imageUrl: parents[0].metadata.image,
          videoUrl: parents[0].metadata.animation_url,
        },
        wallet,
      );

      const minted = await mintNFT(combined);
      saveNFT(minted);

      const xael = dreamToXAELData(
        { id: minted.dreamId, narrative: narrative.trim(), themes, assetMetadata: { rarityScore: 75 } },
        wallet.address,
      );
      const price = estimateDreamXAELValue(xael, parents.length);
      createListingFromNFT(minted, price);

      await notifyNFTMinted(minted.metadata.name, minted.id, wallet.address, minted.metadata.image);
      navigate('exchange');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Combine failed');
    } finally {
      setBusy(false);
    }
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

      <div className="rounded-3xl border border-line bg-gradient-to-br from-dusk/10 to-cream p-6 shadow-lift">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Dream combine</p>
        <h2 className="font-serif text-2xl text-ink mt-1">Fuse dream NFTs</h2>
        <p className="text-sm text-muted mt-2">
          Merge two to four minted dreams into a remix NFT with shared royalties.
        </p>
      </div>

      {eligible.length < 2 ? (
        <p className="text-sm text-muted text-center py-8">
          Mint at least two dreams as NFTs before combining.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted font-medium">Parent NFTs</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {eligible.map((nft: DreamNFT) => {
                const on = selected.includes(nft.id);
                return (
                  <button
                    key={nft.id}
                    type="button"
                    onClick={() => toggle(nft.id)}
                    className={`rounded-2xl border p-3 text-left transition flex gap-3 ${
                      on ? 'border-sage bg-sage/10' : 'border-line bg-cream hover:border-sage/30'
                    }`}
                  >
                    {nft.metadata.image && (
                      <img src={nft.metadata.image} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink truncate">{nft.metadata.name}</div>
                      <div className="text-xs text-muted capitalize">{nft.status}</div>
                    </div>
                    {on && <Sparkles className="w-4 h-4 text-sageDark shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-line bg-cream p-4">
            <label className="block text-sm font-medium text-ink">
              Combined title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Oceanflight fusion"
                className="mt-1 w-full rounded-xl border border-line bg-parchment px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              Narrative (optional)
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                rows={3}
                placeholder="Describe how these dreams merge…"
                className="mt-1 w-full rounded-xl border border-line bg-parchment px-3 py-2 text-sm resize-none"
              />
            </label>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="button"
            onClick={handleCombine}
            disabled={busy || parents.length < 2}
            className="w-full bg-sage hover:bg-sageDark text-cream py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Combining…
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" /> Combine & list on exchange
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}