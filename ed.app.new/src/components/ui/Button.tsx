import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * EverDream Button component with primary, ghost, and danger variants.
 * Supports loading state with built-in spinner, icons, and full-width mode.
 *
 * @example
 * <Button variant="primary" size="md" loading={isSaving} icon={<Save size={16} />}>
 *   Save Dream
 * </Button>
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  disabled,
  children,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    transition: 'all 180ms ease-out',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '8px 16px', fontSize: '0.7rem', borderRadius: '8px' },
    md: { padding: '12px 24px', fontSize: '0.75rem', borderRadius: '12px' },
    lg: { padding: '16px 32px', fontSize: '0.85rem', borderRadius: '16px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #5ec4a8, #4a9e86)',
      color: '#fff',
      boxShadow: '0 4px 12px rgba(94, 196, 168, 0.25)',
    },
    ghost: {
      background: 'transparent',
      color: '#4a4860',
      border: '1px solid rgba(168, 237, 220, 0.22)',
    },
    danger: {
      background: 'linear-gradient(135deg, #e88fa0, #c86070)',
      color: '#fff',
      boxShadow: '0 4px 12px rgba(232, 143, 160, 0.25)',
    },
  };

  return (
    <button
      style={{ ...baseStyles, ...sizeStyles[size], ...variantStyles[variant], ...style }}
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {loading ? (
        <span style={{
          width: '14px', height: '14px',
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }} />
      ) : icon ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
