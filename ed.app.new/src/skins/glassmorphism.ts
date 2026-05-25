/**
 * Glassmorphism Design System — CSS Variables & Utilities
 * 
 * Provides a cohesive visual language with:
 * - Glass-like translucent surfaces
 * - Subtle gradients and shadows
 * - Smooth animations and transitions
 * - Accessibility-compliant contrast ratios
 * 
 * Usage: Import this file in your main CSS or use the utility classes
 */

export const glassmorphismCSS = `
/* ── CSS Custom Properties (Design Tokens) ────────────────────── */
:root {
  /* Primary Brand Colors */
  --brand-primary: #5ec4a8;
  --brand-primary-dark: #4ab392;
  --brand-secondary: #a8eddc;
  --brand-accent: #e88fa0;
  
  /* Neutral Palette */
  --neutral-ink: #1a1a2e;
  --neutral-slate: #4a4a68;
  --neutral-muted: #9b96b0;
  --neutral-line: #d8dae2;
  --neutral-cream: #f8f7fa;
  --neutral-parchment: #f0eff4;
  
  /* Semantic Colors */
  --success: #5ec4a8;
  --warning: #f5a623;
  --error: #e88fa0;
  --info: #7fb3d5;
  
  /* Glassmorphism Base */
  --glass-bg: rgba(255, 255, 255, 0.65);
  --glass-bg-light: rgba(255, 255, 255, 0.45);
  --glass-bg-heavy: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(168, 237, 220, 0.22);
  --glass-border-strong: rgba(168, 237, 220, 0.45);
  --glass-shadow: 0 1px 6px rgba(168, 237, 220, 0.10);
  --glass-shadow-lg: 0 8px 32px rgba(168, 237, 220, 0.15);
  --glass-shadow-xl: 0 16px 48px rgba(168, 237, 220, 0.20);
  --glass-blur: blur(12px);
  --glass-blur-strong: blur(20px);
  
  /* Gradients */
  --gradient-dream: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-sage: linear-gradient(135deg, #5ec4a8 0%, #a8eddc 100%);
  --gradient-sunset: linear-gradient(135deg, #e88fa0 0%, #f5a623 100%);
  --gradient-night: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%);
  --gradient-frost: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%);
  
  /* Typography */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-display: 'Playfair Display', Georgia, serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* Spacing Scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  
  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
  
  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-bounce: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
  
  /* Z-Index Layers */
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal-backdrop: 300;
  --z-modal: 400;
  --z-popover: 500;
  --z-tooltip: 600;
  --z-notification: 700;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --glass-bg: rgba(30, 30, 46, 0.65);
    --glass-bg-light: rgba(30, 30, 46, 0.45);
    --glass-bg-heavy: rgba(30, 30, 46, 0.85);
    --glass-border: rgba(168, 237, 220, 0.15);
    --neutral-ink: #f8f7fa;
    --neutral-cream: #1a1a2e;
    --neutral-parchment: #24243e;
  }
}

/* ── Utility Classes ──────────────────────────────────────────── */

.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.glass-light {
  background: var(--glass-bg-light);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
}

.glass-heavy {
  background: var(--glass-bg-heavy);
  backdrop-filter: var(--glass-blur-strong);
  -webkit-backdrop-filter: var(--glass-blur-strong);
  border: 1px solid var(--glass-border-strong);
  box-shadow: var(--glass-shadow-lg);
}

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--glass-shadow);
  transition: all var(--transition-base);
}

.glass-card:hover {
  box-shadow: var(--glass-shadow-lg);
  transform: translateY(-2px);
}

.glass-button {
  background: var(--glass-bg-light);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.glass-button:hover {
  background: var(--glass-bg);
  box-shadow: var(--glass-shadow);
}

.glass-input {
  background: var(--glass-bg-light);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.glass-input:focus {
  background: var(--glass-bg);
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 3px rgba(94, 196, 168, 0.15);
  outline: none;
}

/* Gradient backgrounds */
.gradient-dream {
  background: var(--gradient-dream);
}

.gradient-sage {
  background: var(--gradient-sage);
}

.gradient-sunset {
  background: var(--gradient-sunset);
}

.gradient-night {
  background: var(--gradient-night);
}

/* Text gradients */
.text-gradient {
  background: var(--gradient-sage);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.text-gradient-dream {
  background: var(--gradient-dream);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Animations */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: var(--glass-shadow); }
  50% { box-shadow: var(--glass-shadow-lg); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.animate-shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus visible for keyboard navigation */
.focus-visible-ring:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .glass, .glass-card, .glass-button, .glass-input {
    border-width: 2px;
    border-color: var(--neutral-ink);
  }
}
`;

/**
 * Tailwind CSS plugin configuration for glassmorphism
 * Add this to tailwind.config.js
 */
export const tailwindPluginConfig = `
const plugin = require('tailwindcss/plugin');

module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#5ec4a8',
          secondary: '#a8eddc',
          accent: '#e88fa0',
        },
        glass: {
          bg: 'rgba(255, 255, 255, 0.65)',
          border: 'rgba(168, 237, 220, 0.22)',
        },
      },
      backdropBlur: {
        'glass': '12px',
        'glass-strong': '20px',
      },
      boxShadow: {
        'glass': '0 1px 6px rgba(168, 237, 220, 0.10)',
        'glass-lg': '0 8px 32px rgba(168, 237, 220, 0.15)',
        'glass-xl': '0 16px 48px rgba(168, 237, 220, 0.20)',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 1px 6px rgba(168, 237, 220, 0.10)' },
          '50%': { boxShadow: '0 8px 32px rgba(168, 237, 220, 0.15)' },
        },
      },
    },
  },
  plugins: [
    plugin(function({ addUtilities, theme }) {
      const newUtilities = {
        '.glass': {
          background: theme('colors.glass.bg'),
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid ' + theme('colors.glass.border'),
          boxShadow: theme('boxShadow.glass'),
        },
        '.glass-light': {
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        },
        '.glass-heavy': {
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(168, 237, 220, 0.45)',
          boxShadow: theme('boxShadow.glass-lg'),
        },
      };
      addUtilities(newUtilities);
    }),
  ],
};
`;

/**
 * React inline styles for glassmorphism components
 */
export const glassStyles = {
  card: {
    background: 'var(--glass-bg, rgba(255,255,255,0.65))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border, rgba(168,237,220,0.22))',
    borderRadius: '16px',
    boxShadow: 'var(--glass-shadow, 0 1px 6px rgba(168,237,220,0.10))',
  } as React.CSSProperties,
  
  button: {
    background: 'var(--glass-bg-light, rgba(255,255,255,0.45))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border, rgba(168,237,220,0.22))',
    borderRadius: '12px',
    transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  } as React.CSSProperties,
  
  input: {
    background: 'var(--glass-bg-light, rgba(255,255,255,0.45))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border, rgba(168,237,220,0.22))',
    borderRadius: '12px',
  } as React.CSSProperties,
  
  modal: {
    background: 'var(--glass-bg-heavy, rgba(255,255,255,0.85))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--glass-border-strong, rgba(168,237,220,0.45))',
    borderRadius: '24px',
    boxShadow: 'var(--glass-shadow-xl, 0 16px 48px rgba(168,237,220,0.20))',
  } as React.CSSProperties,
};

export default {
  glassmorphismCSS,
  tailwindPluginConfig,
  glassStyles,
};
