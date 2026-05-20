import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * EmptyState — displayed when there's no content to show.
 * Shows an icon, message, optional description, and optional action button.
 *
 * @example
 * <EmptyState
 *   icon={Calendar}
 *   message="No dreams match your search"
 *   description="Try adjusting your filters"
 *   action={{ label: 'Record a dream', onClick: () => navigate('record') }}
 * />
 */
export function EmptyState({ icon: Icon, message, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      textAlign: 'center',
    }}>
      <Icon size={48} color="rgba(168,237,220,0.4)" />
      <h3 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '1.2rem',
        color: '#4a4860',
        margin: '20px 0 8px 0',
      }}>
        {message}
      </h3>
      {description && (
        <p style={{
          color: '#9b96b0',
          fontSize: '0.85rem',
          maxWidth: '320px',
          lineHeight: 1.6,
          margin: '0 0 20px 0',
        }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #5ec4a8, #4a9e86)',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(94,196,168,0.25)',
            transition: 'all 180ms ease-out',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
