import { Calendar, Shield, Star } from 'lucide-react';
import type { ErrorBannerProps, LoadingOverlayProps } from '../components/ui';
import { useSubscription } from '../hooks/use-subscription';

interface Dream {
  id: string;
  date: string;
  content: string;
  category: string;
  themes: string[];
  emotion: string;
  nugget: string;
  generatedImage?: {
    url: string;
  };
  assetMetadata?: {
    rarityScore: number;
  };
}

interface JournalScreenProps {
  dreams: Dream[];
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  isLoadingDreams: boolean;
  dreamError: string | null;
  onDismissError: () => void;
  onRetry: () => void;
  onNavigate: (screen: string, dreamId?: string) => void;
  onShare: (dream: Dream) => void;
  favouriteIds: string[];
  onToggleFavourite: (dreamId: string) => void;
  getCategoryBadgeClass: (category: string) => string;
  getEmotionEmoji: (emotion: string) => string;
  ErrorBanner: React.ComponentType<ErrorBannerProps>;
  LoadingOverlay: React.ComponentType<LoadingOverlayProps>;
  /** When set, only show these dreams (e.g. favourites list) and hide the category filter */
  title?: string;
  subtitle?: string;
  hideFilter?: boolean;
}

export function JournalScreen({
  dreams,
  filterCategory,
  setFilterCategory,
  isLoadingDreams,
  dreamError,
  onDismissError,
  onRetry,
  onNavigate,
  onShare,
  favouriteIds,
  onToggleFavourite,
  getCategoryBadgeClass,
  getEmotionEmoji,
  ErrorBanner,
  LoadingOverlay,
  title = 'Dream journal',
  subtitle = 'Browse everything you have captured.',
  hideFilter = false,
}: JournalScreenProps) {
  const filteredDreams = dreams.filter((dream) => {
    const matchesCategory = filterCategory === 'all' || dream.category === filterCategory;
    return matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {dreamError && (
        <ErrorBanner
          error={dreamError}
          onDismiss={onDismissError}
          onRetry={onRetry}
        />
      )}

      {!hideFilter && (
        <div className="flex items-center justify-end mb-1">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-cream border border-line rounded-xl px-3 py-2.5 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-sage/35 shadow-paper shrink-0"
          >
            <option value="all">All Types</option>
            <option value="peaceful">Peaceful</option>
            <option value="lucid">Lucid</option>
            <option value="nightmare">Nightmare</option>
            <option value="adventure">Adventure</option>
            <option value="anxiety">Anxiety</option>
          </select>
        </div>
      )}

      <h2 className="font-serif text-2xl font-medium text-ink mb-1">{title}</h2>
      <p className="text-sm text-muted mb-4">{subtitle}</p>

      {/* Loading State */}
      {isLoadingDreams ? (
        <LoadingOverlay message="Loading your dreams..." />
      ) : filteredDreams.length === 0 ? (
        dreams.length === 0 ? (
          <div className="text-center py-16 px-6 border border-dashed border-line rounded-3xl bg-parchment/30">
            <p className="text-ink font-medium mb-2">
              {hideFilter ? 'No favourites yet' : 'No dreams yet'}
            </p>
            <p className="text-sm text-muted">
              {hideFilter ? (
                'Tap the star on any dream to save it here.'
              ) : (
                <>
                  When you record a dream you can see a summary here.
                  <br />
                  Click the record button to add your first entry.
                </>
              )}
            </p>
          </div>
        ) : (
          <EmptyState icon={Calendar} message="No dreams match this filter" />
        )
      ) : (
        <div className="space-y-3">
          {filteredDreams.map((dream) => (
            <DreamCard
              key={dream.id}
              dream={dream}
              getCategoryBadgeClass={getCategoryBadgeClass}
              getEmotionEmoji={getEmotionEmoji}
              onShare={onShare}
              onClick={() => onNavigate('dream', dream.id)}
              isFavourite={favouriteIds.includes(dream.id)}
              onToggleFavourite={() => onToggleFavourite(dream.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper Components
interface DreamCardProps {
  dream: Dream;
  getCategoryBadgeClass: (category: string) => string;
  getEmotionEmoji: (emotion: string) => string;
  onShare: (dream: Dream) => void;
  onClick: () => void;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}

function DreamCard({
  dream,
  getCategoryBadgeClass,
  getEmotionEmoji,
  onClick,
  isFavourite,
  onToggleFavourite,
}: DreamCardProps) {
  // MVP: depth / worth metrics only for admin
  const { isAdmin } = useSubscription();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
      className="relative rounded-2xl overflow-hidden border border-line bg-cream shadow-paper transition hover:border-dusk/25 cursor-pointer text-left"
    >
      {/* Favourite star — top right */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavourite();
        }}
        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 border border-line shadow-paper flex items-center justify-center hover:bg-white transition"
        aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
        aria-pressed={isFavourite}
      >
        <Star
          className={`w-4 h-4 ${isFavourite ? 'text-amber-500 fill-amber-400' : 'text-muted'}`}
          strokeWidth={1.75}
        />
      </button>

      {dream.generatedImage && (
        <img
          src={dream.generatedImage.url}
          alt="Dream visualization"
          className="w-full h-44 object-cover"
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3 pr-10">
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted uppercase tracking-wide">
              {new Date(dream.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <span className="text-xl">{getEmotionEmoji(dream.emotion)}</span>
          </div>
          <span
            className={`${getCategoryBadgeClass(dream.category)} px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide`}
          >
            {dream.category}
          </span>
        </div>

        <div className="mb-3">
          <p className="text-sm font-serif font-medium text-ink mb-2 italic leading-snug">
            "{dream.nugget}"
          </p>
        </div>

        <div className="flex gap-2 flex-wrap mb-2">
          {dream.themes?.slice(0, 4).map((theme, i) => (
            <span
              key={i}
              className="text-[11px] text-muted bg-parchment border border-line px-2 py-0.5 rounded-full"
            >
              {theme}
            </span>
          ))}
        </div>

        {isAdmin && dream.assetMetadata && (
          <div className="flex items-center justify-between text-xs text-muted border-t border-line pt-3 mt-1">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-sage" strokeWidth={1.75} />
              Depth {dream.assetMetadata.rarityScore}
            </span>
            <span className="font-mono text-[10px]">#{dream.id.substring(0, 8)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  message: string;
}

function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="text-center py-14 text-muted border border-dashed border-line rounded-3xl bg-parchment/35">
      <Icon className="w-14 h-14 mx-auto mb-4 opacity-35 text-duskDeep" strokeWidth={1.25} />
      <p className="text-ink font-medium">{message}</p>
    </div>
  );
}
