import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface InsightCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  color?: string;
}

/**
 * InsightCard — displays a single insight/metric in the insights screen.
 *
 * @example
 * <InsightCard
 *   title="Total Dreams"
 *   value={42}
 *   subtitle="Last 30 days"
 *   trend="up"
 *   color="#5ec4a8"
 * />
 */
export function InsightCard({ title, value, subtitle, trend, icon, color = '#5ec4a8' }: InsightCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#5ec4a8' : trend === 'down' ? '#e88fa0' : '#9b96b0';

  return (
    <div style={{
      background: 'var(--glass-bg, rgba(255,255,255,0.65))',
      backdropFilter: 'blur(8px)',
      border: '1px solid var(--glass-border, rgba(168,237,220,0.22))',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: 'var(--glass-shadow, 0 1px 6px rgba(168,237,220,0.10))',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          color: '#9b96b0',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          {title}
        </span>
        {trend && <TrendIcon size={16} color={trendColor} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        {icon && <span style={{ color }}>{icon}</span>}
        <span style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '1.8rem',
          fontWeight: 700,
          color: '#1a1a2e',
          lineHeight: 1,
        }}>
          {value}
        </span>
      </div>
      {subtitle && (
        <span style={{ fontSize: '0.75rem', color: '#9b96b0' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
