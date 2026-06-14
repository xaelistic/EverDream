import React, { useState, useMemo } from 'react';
import { Badge, Spinner, Skeleton } from '../ui';
import { Card } from '../ui/Card';
import { Search, Filter, Moon, Sparkles } from 'lucide-react';
import { getEmotionEmoji } from '../../utils/dreamPresentation';

/** Dream data shape expected by DreamList */
export interface Dream {
  id: string;
  title: string;
  content: string;
  mood?: string;
  category: string;
  date: string;
  imageUrl?: string;
  nugget?: string;
  aiAnalysis?: {
    symbols: string[];
    themes: string[];
    emotion?: string;
    narrative?: string;
    interpretation: {
      symbols?: Record<string, string>;
      meaning?: string;
      commonPattern?: string;
    } | string;
    valence?: number;
  };
}

export interface DreamListProps {
  dreams: Dream[];
  loading?: boolean;
  onSelectDream: (dream: Dream) => void;
  onSearch?: (query: string) => void;
  onFilterCategory?: (category: string) => void;
}

/**
 * DreamList — Grid of dream cards with search/filter bar,
 * empty state, and loading skeleton.
 *
 * @example
 * <DreamList
 *   dreams={dreams}
 *   loading={isLoading}
 *   onSelectDream={(d) => navigate(`/dreams/${d.id}`)}
 *   onSearch={setSearchQuery}
 *   onFilterCategory={setCategory}
 * />
 */
export default function DreamList({
  dreams,
  loading = false,
  onSelectDream,
  onSearch,
  onFilterCategory,
}: DreamListProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [localFilter, setLocalFilter] = useState('all');

  const categories = useMemo(() => {
    const cats = new Set(dreams.map(d => d.category));
    return ['all', ...Array.from(cats)];
  }, [dreams]);

  const filteredDreams = useMemo(() => {
    let result = dreams;

    const query = localSearch.toLowerCase();
    if (query) {
      result = result.filter(d =>
        d.title.toLowerCase().includes(query) ||
        d.content.toLowerCase().includes(query) ||
        (d.mood && d.mood.toLowerCase().includes(query))
      );
    }

    if (localFilter !== 'all') {
      result = result.filter(d => d.category === localFilter);
    }

    return result;
  }, [dreams, localSearch, localFilter]);

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    onSearch?.(value);
  };

  const handleFilter = (value: string) => {
    setLocalFilter(value);
    onFilterCategory?.(value);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Skeleton lines={1} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
          marginTop: '24px',
        }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <Skeleton lines={3} />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '2rem',
          color: '#1a1a2e',
          margin: '0 0 8px 0',
        }}>
          Dream Journal
        </h1>
        <p style={{ color: '#9b96b0', fontSize: '0.85rem', margin: 0 }}>
          {dreams.length} {dreams.length === 1 ? 'dream' : 'dreams'} recorded
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          flex: '1 1 260px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(255,255,255,0.65)',
          border: '1px solid rgba(168,237,220,0.22)',
          borderRadius: '12px',
          padding: '10px 16px',
        }}>
          <Search size={18} color="#9b96b0" />
          <input
            type="text"
            placeholder="Search dreams, moods, symbols..."
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              border: 'none',
              background: 'none',
              outline: 'none',
              flex: 1,
              fontSize: '0.85rem',
              color: '#4a4860',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.65)',
          border: '1px solid rgba(168,237,220,0.22)',
          borderRadius: '12px',
          padding: '10px 16px',
        }}>
          <Filter size={16} color="#9b96b0" />
          <select
            value={localFilter}
            onChange={(e) => handleFilter(e.target.value)}
            style={{
              border: 'none',
              background: 'none',
              outline: 'none',
              fontSize: '0.8rem',
              color: '#4a4860',
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: 'pointer',
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Types' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredDreams.length === 0 && !loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 24px',
          textAlign: 'center',
        }}>
          <Moon size={64} color="rgba(168,237,220,0.4)" />
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.4rem',
            color: '#4a4860',
            margin: '24px 0 8px 0',
          }}>
            {dreams.length === 0 ? 'No dreams yet' : 'No matching dreams'}
          </h2>
          <p style={{
            color: '#9b96b0',
            fontSize: '0.85rem',
            maxWidth: '400px',
            lineHeight: 1.6,
          }}>
            {dreams.length === 0
              ? 'Start recording your dreams to build your personal dream journal. Your subconscious has stories to tell.'
              : 'Try adjusting your search or filter to find what you\'re looking for.'}
          </p>
        </div>
      )}

      {/* Dream Grid */}
      {filteredDreams.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {filteredDreams.map(dream => (
            <DreamCard key={dream.id} dream={dream} onClick={() => onSelectDream(dream)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Individual Dream Card ─── */

interface DreamCardProps {
  dream: Dream;
  onClick: () => void;
}

function DreamCard({ dream, onClick }: DreamCardProps) {
  const categoryVariant = getCategoryVariant(dream.category);

  return (
    <Card hover onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} data-component="DreamList">
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {dream.mood && (
            <span style={{ fontSize: '1.2rem' }}>{getEmotionEmoji(dream.mood)}</span>
          )}
          <Badge variant={categoryVariant}>{dream.category}</Badge>
        </div>
        <span style={{
          fontSize: '0.7rem',
          color: '#9b96b0',
          whiteSpace: 'nowrap',
        }}>
          {formatDate(dream.date)}
        </span>
      </div>

      {/* Title */}
      <h3 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '1.1rem',
        color: '#1a1a2e',
        margin: 0,
        lineHeight: 1.4,
      }}>
        {dream.title}
      </h3>

      {/* Content Preview */}
      <p style={{
        fontSize: '0.8rem',
        color: '#9b96b0',
        lineHeight: 1.6,
        margin: 0,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {dream.content}
      </p>

      {/* AI Analysis Indicator */}
      {dream.aiAnalysis && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(168,237,220,0.15)',
        }}>
          <Sparkles size={12} color="#9b8fd4" />
          <span style={{ fontSize: '0.65rem', color: '#9b8fd4', fontWeight: 600 }}>
            AI Analyzed
          </span>
          {dream.imageUrl && (
            <>
              <span style={{ color: '#9b96b0', fontSize: '0.65rem' }}>•</span>
              <span style={{ fontSize: '0.65rem', color: '#9b8fd4', fontWeight: 600 }}>
                Image Generated
              </span>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

/* ─── Helpers ─── */

function getCategoryVariant(category: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    normal: 'default',
    lucid: 'info',
    nightmare: 'error',
    recurring: 'warning',
    prophetic: 'success',
    adventure: 'success',
    peaceful: 'success',
    anxiety: 'warning',
  };
  return map[category] || 'default';
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
