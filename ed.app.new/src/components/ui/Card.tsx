import React, { useState } from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

/**
 * Glass-morphism card component with optional hover lift effect.
 * Supports configurable padding sizes.
 *
 * @example
 * <Card hover onClick={() => selectDream(id)} padding="lg">
 *   <h3>{dream.title}</h3>
 * </Card>
 */
export function Card({
  children,
  className = '',
  onClick,
  hover = false,
  padding = 'md',
  style,
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const paddingMap: Record<string, string> = {
    none: '0',
    sm: '12px',
    md: 'var(--space-lg, 24px)',
    lg: '32px',
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'var(--glass-bg, rgba(255,255,255,0.65))',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--glass-border, rgba(168,237,220,0.22))',
        borderRadius: '16px',
        padding: paddingMap[padding],
        boxShadow: isHovered && hover
          ? '0 8px 24px rgba(168,237,220,0.15)'
          : 'var(--glass-shadow, 0 1px 6px rgba(168,237,220,0.10))',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 180ms ease-out',
        transform: isHovered && hover ? 'translateY(-2px)' : 'none',
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}
