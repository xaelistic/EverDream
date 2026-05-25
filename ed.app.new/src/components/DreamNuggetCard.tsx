import { Shield } from 'lucide-react';

type Dream = {
  id: string;
  date: string;
  nugget: string;
  category: string;
  emotion: string;
  assetMetadata?: {
    rarityScore: number;
  };
  isSample?: boolean;
};

type DreamNuggetCardProps = {
  dream: Dream;
  getCategoryBadgeClass: (category: string) => string;
  getEmotionEmoji: (emotion: string) => string;
  onClick: () => void;
};

export default function DreamNuggetCard({
  dream,
  getCategoryBadgeClass,
  getEmotionEmoji,
  onClick,
}: DreamNuggetCardProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      className="rounded-2xl border border-line bg-cream p-4 shadow-paper cursor-pointer hover:border-dusk/30 hover:bg-parchment/40 transition"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted uppercase tracking-wide">
            {new Date(dream.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className="text-lg">{getEmotionEmoji(dream.emotion)}</span>
        </div>
        <span className={`${getCategoryBadgeClass(dream.category)} px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide`}>
          {dream.category}
        </span>
      </div>
      <p className="text-ink italic text-sm leading-relaxed font-serif">
        "{dream.nugget}"
      </p>
      {dream.assetMetadata && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
          <Shield className="w-3 h-3 text-sage" strokeWidth={1.75} />
          <span>Depth {dream.assetMetadata.rarityScore}</span>
        </div>
      )}
      {dream.isSample && (
        <div className="mt-3 text-xs text-muted bg-parchment border border-line rounded-xl px-3 py-2">
          Sample entry — tap Record to add your own.
        </div>
      )}
    </div>
  );
}
