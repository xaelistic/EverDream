import React from 'react';

interface BreathingMoonProps {
  className?: string;
  size?: number;
}

/**
 * BreathingMoon — Animated SVG moon component (ported from sleep-whispers-flow)
 * Gentle breathing/pulsing animation for onboarding welcome step.
 */
export function BreathingMoon({ className = '', size = 120 }: BreathingMoonProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }}
    >
      <defs>
        <linearGradient id="moonGrad" x1="30%" y1="20%" x2="70%" y2="80%">
          <stop offset="0%" stopColor="oklch(0.95 0.02 80)" />
          <stop offset="100%" stopColor="oklch(0.88 0.03 60)" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Moon body with breathing animation */}
      <g>
        <animateTransform
          attributeName="transform"
          type="scale"
          values="1; 1.03; 1"
          dur="3.5s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="url(#moonGrad)"
          filter="url(#glow)"
        />
        {/* Craters for texture */}
        <circle cx="45" cy="48" r="6" fill="oklch(0.82 0.02 70 / 0.6)" />
        <circle cx="72" cy="55" r="4" fill="oklch(0.82 0.02 70 / 0.5)" />
        <circle cx="55" cy="72" r="5" fill="oklch(0.82 0.02 70 / 0.55)" />
        <circle cx="78" cy="38" r="3" fill="oklch(0.82 0.02 70 / 0.4)" />
      </g>

      {/* Subtle ring / atmosphere */}
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="oklch(0.7 0.04 80 / 0.3)"
        strokeWidth="1.5"
      >
        <animate
          attributeName="r"
          values="50; 52; 50"
          dur="3.5s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

export default BreathingMoon;