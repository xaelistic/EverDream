import React from 'react';
import { Sparkles, Share2, Video } from 'lucide-react';
import { getEmotionEmoji } from '../../utils/dreamPresentation';

export interface DreamCardProps {
  dream: {
    id: string;
    date: string;
    content: string;
    category: string;
    emotion?: string;
    themes?: string[];
    nugget?: string;
    generatedImage?: { url: string } | null;
    videoCapture?: { url: string; duration?: number } | null;
    assetMetadata?: { rarityScore?: number };
    isSample?: boolean;
  };
  getCategoryBadgeClass: (category: string) => string;
  getEmotionEmoji: (emotion: string) => string;
  onShare: (dream: unknown) => void;
  onClick: () => void;
}

/**
 * DreamCard — Compact dream card for the journal list.
 * Shows category badge, emotion, date, nugget preview, and AI analysis indicator.
 */
export function DreamCard({ dream, getCategoryBadgeClass, getEmotionEmoji: getEmoji, onShare, onClick }: DreamCardProps) {
  const formattedDate = (() => {
    try {
      const date = new Date(dream.date);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dream.date;
    }
  })();

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--glass-bg, rgba(255,255,255,0.65))',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--glass-border, rgba(168,237,220,0.22))',
        borderRadius: '16px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 180ms ease-out',
        boxShadow: 'var(--glass-shadow, 0 1px 6px rgba(168,237,220,0.10))',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(168,237,220,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'var(--glass-shadow, 0 1px 6px rgba(168,237,220,0.10))';
      }}
    >
      {/* Video Thumbnail or Generated Image */}
      {dream.videoCapture?.url ? (
        <div style={{ position: 'relative', marginBottom: '12px', borderRadius: '12px', overflow: 'hidden' }}>
          <video
            src={dream.videoCapture.url}
            style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            background: 'rgba(0,0,0,0.7)',
            borderRadius: '6px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <Video size={12} color="#fff" />
            <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 600 }}>
              {dream.videoCapture.duration ? `${dream.videoCapture.duration}s` : 'Video'}
            </span>
          </div>
        </div>
      ) : dream.generatedImage ? (
        <img 
          src={dream.generatedImage.url} 
          alt="Dream visualization"
          style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', marginBottom: '12px' }}
        />
      ) : null}

      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`${getCategoryBadgeClass(dream.category)} px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider`}>
            {dream.category}
          </span>
          {dream.emotion && (
            <span style={{ fontSize: '1.1rem' }}>{getEmoji(dream.emotion)}</span>
          )}
        </div>
        <span style={{ fontSize: '0.7rem', color: '#9b96b0', whiteSpace: 'nowrap' }}>
          {formattedDate}
        </span>
      </div>

      {/* Nugget / Content Preview */}
      <p style={{
        fontSize: '0.85rem',
        color: '#4a4860',
        lineHeight: 1.6,
        margin: '0 0 8px 0',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, serif",
        fontStyle: 'italic',
      }}>
        "{dream.nugget || dream.content.substring(0, 120)}"
      </p>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '8px',
        borderTop: '1px solid rgba(168,237,220,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={12} color="#9b8fd4" />
          <span style={{ fontSize: '0.65rem', color: '#9b8fd4', fontWeight: 600 }}>
            AI Analyzed
          </span>
          {dream.generatedImage && (
            <>
              <span style={{ color: '#9b96b0', fontSize: '0.65rem' }}>•</span>
              <span style={{ fontSize: '0.65rem', color: '#9b8fd4', fontWeight: 600 }}>
                Visualized
              </span>
            </>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onShare(dream); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9b96b0',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Share dream"
        >
          <Share2 size={14} />
        </button>
      </div>
    </div>
  );
}
