import { Search, Calendar, Shield } from 'lucide-react';
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
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  isLoadingDreams: boolean;
  dreamError: string | null;
  onDismissError: () => void;
  onRetry: () => void;
  onNavigate: (screen: string, dreamId?: string) => void;
  onShare: (dream: Dream) => void;
  getCategoryBadgeClass: (category: string) => string;
  getEmotionEmoji: (emotion: string) => string;
  ErrorBanner: React.ComponentType<ErrorBannerProps>;
  LoadingOverlay: React.ComponentType<LoadingOverlayProps>;
}

export function JournalScreen({
  dreams,
  searchQuery,
  setSearchQuery,
  filterCategory,
  setFilterCategory,
  isLoadingDreams,
  dreamError,
  onDismissError,
  onRetry,
  onNavigate,
  onShare,
  getCategoryBadgeClass,
  getEmotionEmoji,
  ErrorBanner,
  LoadingOverlay,
}: JournalScreenProps) {
  const filteredDreams = dreams.filter(dream => {
    const matchesSearch = dream.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dream.nugget?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dream.themes?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || dream.category === filterCategory;
    return matchesSearch && matchesCategory;
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

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search dreams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-cream border border-line rounded-xl pl-10 pr-4 py-2.5 text-ink placeholder:text-muted/70 text-sm focus:outline-none focus:ring-2 focus:ring-sage/35 shadow-paper"
          />
        </div>
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

      <h2 className="font-serif text-2xl font-medium text-ink mb-1">Dream journal</h2>
      <p className="text-sm text-muted mb-4">Browse everything you have captured.</p>

      {/* Loading State */}
      {isLoadingDreams ? (
        <LoadingOverlay message="Loading your dreams..." />
      ) : filteredDreams.length === 0 ? (
        dreams.length === 0 ? (
          <div className="text-center py-16 px-6 border border-dashed border-line rounded-3xl bg-parchment/30">
            <p className="text-ink font-medium mb-2">No dreams yet</p>
            <p className="text-sm text-muted">When you record a dream you can see a summary here.<br />Click the record button to add your first entry.</p>
          </div>
        ) : (
          <EmptyState icon={Calendar} message="No dreams match your search" />
        )
      ) : (
        <div className="space-y-3">
          {filteredDreams.map(dream => (
            <DreamCard 
              key={dream.id} 
              dream={dream} 
              getCategoryBadgeClass={getCategoryBadgeClass} 
              getEmotionEmoji={getEmotionEmoji}
              onShare={onShare}
              onClick={() => onNavigate('dream', dream.id)}
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
}

function DreamCard({ dream, getCategoryBadgeClass, getEmotionEmoji, onShare, onClick }: DreamCardProps) {
  // MVP: depth / worth metrics only for admin
  const { isAdmin } = useSubscription();

  return (
    <div 
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      className="rounded-2xl overflow-hidden border border-line bg-cream shadow-paper transition hover:border-dusk/25 cursor-pointer text-left"
    >
      {dream.generatedImage && (
        <img 
          src={dream.generatedImage.url} 
          alt="Dream visualization"
          className="w-full h-44 object-cover"
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted uppercase tracking-wide">
              {new Date(dream.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <span className="text-xl">{getEmotionEmoji(dream.emotion)}</span>
          </div>
          <span className={`${getCategoryBadgeClass(dream.category)} px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide`}>
            {dream.category}
          </span>
        </div>
        
        <div className="mb-3">
          <p className="text-sm font-serif font-medium text-ink mb-2 italic leading-snug">"{dream.nugget}"</p>
        </div>
        
        <div className="flex gap-2 flex-wrap mb-2">
          {dream.themes?.slice(0, 4).map((theme, i) => (
            <span key={i} className="text-[11px] text-muted bg-parchment border border-line px-2 py-0.5 rounded-full">
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
