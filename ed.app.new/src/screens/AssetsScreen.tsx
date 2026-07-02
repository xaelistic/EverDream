import { Shield } from 'lucide-react';
import { FEATURE_NFT_UI_ENABLED } from '../config/features';

interface Dream {
  id: string;
  date: string;
  category: string;
  nugget?: string;
  generatedImage?: {
    url: string;
  };
  assetMetadata?: {
    rarityScore: number;
  };
  isSample?: boolean;
}

interface InsightsData {
  avgRarity?: string;
  totalAssetValue?: number;
}

interface AssetsScreenProps {
  dreams: Dream[];
  insights: InsightsData | null;
  setSelectedDream: (dream: Dream) => void;
  setShowAssetInfo: (show: boolean) => void;
  getCategoryBadgeClass: (category: string) => string;
}

export function AssetsScreen({
  dreams,
  insights,
  setSelectedDream,
  setShowAssetInfo,
  getCategoryBadgeClass,
}: AssetsScreenProps) {
  const nonSampleDreams = dreams.filter(d => !d.isSample);

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl font-medium text-ink">Your Dream Assets</h2>

      {/* Asset Overview */}
      <div className="rounded-2xl border border-line bg-cream p-6 shadow-paper">
        <h3 className="font-semibold mb-4 text-sm text-ink">Asset Portfolio</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-bold text-ink">{nonSampleDreams.length}</div>
            <div className="text-sm text-muted">Total Assets</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-ink">{insights?.avgRarity || '0.00'}</div>
            <div className="text-sm text-muted">Avg Rarity</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-ink">${insights?.totalAssetValue || 0}</div>
            <div className="text-sm text-muted">Est. Value</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-ink">{dreams.filter(d => !d.isSample && d.generatedImage).length}</div>
            <div className="text-sm text-muted">With Images</div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
        <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm text-ink">
          <Shield className="w-5 h-5 text-sage" strokeWidth={1.75} />
          Asset Rights & Provenance
        </h3>
        <div className="text-sm space-y-2 text-muted">
          <p>• Every dream is cryptographically watermarked</p>
          <p>• You retain full ownership and control</p>
          <p>• Dreams are licensed, never sold</p>
          <p>• Revocable at any time</p>
          {FEATURE_NFT_UI_ENABLED ? <p>• NFT minting ready when you choose</p> : null}
        </div>
      </div>

      {/* Dream Assets Grid */}
      <div>
        <h3 className="font-semibold mb-3 text-sm text-ink">Your Dream Assets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nonSampleDreams.map(dream => (
            <div
              key={dream.id}
              onClick={() => {
                setSelectedDream(dream);
                setShowAssetInfo(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSelectedDream(dream); setShowAssetInfo(true); } }}
              className="rounded-2xl overflow-hidden border border-line bg-cream cursor-pointer hover:border-dusk/25 transition shadow-paper"
            >
              {dream.generatedImage && (
                <img
                  src={dream.generatedImage.url}
                  alt="Dream visualization"
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`${getCategoryBadgeClass(dream.category)} px-2 py-1 rounded text-xs font-semibold`}>
                    {dream.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Shield className="w-3 h-3 text-sage" strokeWidth={1.75} />
                    Rarity: {dream.assetMetadata?.rarityScore}
                  </div>
                </div>
                <p className="text-sm italic text-ink">"{dream.nugget?.substring(0, 60)}..."</p>
                <div className="text-xs text-muted mt-2">
                  {new Date(dream.date).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
