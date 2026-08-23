import { Shield, Star } from 'lucide-react';
import type { ErrorBannerProps, LoadingOverlayProps } from '../components/ui';
import { useSubscription } from '../hooks/use-subscription';
import { presentDream } from '../lib/dreamClassify';
import { DreamProcessingOverlay } from '../components/dreams/DreamProcessingOverlay';

interface Dream {
  id: string;
  date: string;
  content: string;
  category: string;
  themes: string[];
  emotion: string;
  nugget: string;
  title?: string;
  narrative?: string;
  moodValence?: number;
  processingStatus?: 'processing' | 'complete' | 'failed';
  processingStep?: 'transcribe' | 'analyse' | 'image' | 'complete';
  generatedImage?: {
    url: string;
  };
  capturedEmotions?: { dominantEmotion?: string } | null;
  assetMetadata?: {
    rarityScore: number;
  };
}

interface JournalScreenProps {
  dreams: Dream[];
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
  /** When set, labels the list as a subset (e.g. favourites) */
  title?: string;
  subtitle?: string;
  hideFilter?: boolean;
}

export function JournalScreen({
  dreams,
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

      <h2 className="font-serif text-2xl font-medium text-ink mb-1">{title}</h2>
      <p className="text-sm text-muted mb-4">{subtitle}</p>

      {/* Loading State */}
      {isLoadingDreams ? (
        <LoadingOverlay message="Loading your dreams..." />
      ) : dreams.length === 0 ? (
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
        <div className="space-y-3">
          {dreams.map((dream) => (
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
  const presented = presentDream(dream);
  const processing = dream.processingStatus === 'processing';

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

      {(dream.generatedImage || processing) && (
        <div className="relative">
          {dream.generatedImage ? (
            <img
              src={dream.generatedImage.url}
              alt={presented.title}
              className="w-full h-44 object-cover"
            />
          ) : (
            <div className="w-full h-44 bg-parchment/80" />
          )}
          {processing && <DreamProcessingOverlay step={dream.processingStep} compact />}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3 pr-10">
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted">
              {presented.when.primary}
              {presented.when.secondary ? ` · ${presented.when.secondary}` : ''}
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-muted" title={`Mood: ${presented.emotionName}`}>
              <span className="text-xl leading-none" aria-hidden>{getEmotionEmoji(presented.emotion)}</span>
              {presented.emotionName}
            </span>
          </div>
          <span
            className={`${getCategoryBadgeClass(presented.category)} px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide`}
          >
            {presented.category}
          </span>
        </div>

        <div className="mb-3">
          <h3 className="font-serif text-lg font-medium text-ink leading-snug">
            {presented.title}
          </h3>
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
