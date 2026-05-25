/**
 * MetricBadges — C/E/N Dream Metrics Display Component
 * 
 * Displays the three core dream quality metrics:
 * - Clarity (C): How vivid and memorable the dream was
 * - Emotion (E): Emotional intensity score
 * - Nightmare (N): Nightmare likelihood indicator
 * 
 * Features:
 * - Color-coded badges with gradient backgrounds
 * - Animated value transitions
 * - Tooltips with metric explanations
 * - Responsive sizing
 * - Glassmorphism design system integration
 * 
 * @module MetricBadges
 */

import React, { useState } from 'react';
import { Eye, Heart, Moon, AlertTriangle, Info } from 'lucide-react';

export interface DreamMetrics {
  /** Clarity score: 0-100 (vividness, detail, memorability) */
  clarity: number;
  /** Emotion score: 0-100 (emotional intensity) */
  emotion: number;
  /** Nightmare score: 0-100 (likelihood of being a nightmare) */
  nightmare: number;
}

export interface MetricBadgesProps {
  /** The three C/E/N metric scores */
  metrics: DreamMetrics;
  /** Size variant: 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** Show tooltips on hover */
  showTooltips?: boolean;
  /** Custom className for container */
  className?: string;
  /** Animation enabled */
  animated?: boolean;
}

/**
 * Get color gradient for metric based on score
 */
function getMetricGradient(type: 'clarity' | 'emotion' | 'nightmare', score: number): string {
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  if (type === 'clarity') {
    // Blue to purple gradient based on clarity
    if (normalizedScore >= 75) return 'from-cyan-400 to-blue-500';
    if (normalizedScore >= 50) return 'from-blue-400 to-indigo-500';
    if (normalizedScore >= 25) return 'from-indigo-400 to-purple-500';
    return 'from-purple-400 to-violet-600';
  }
  
  if (type === 'emotion') {
    // Green to red gradient based on intensity
    if (normalizedScore >= 75) return 'from-red-400 to-rose-500';
    if (normalizedScore >= 50) return 'from-orange-400 to-red-500';
    if (normalizedScore >= 25) return 'from-yellow-400 to-orange-500';
    return 'from-green-400 to-emerald-500';
  }
  
  // Nightmare - yellow to deep purple
  if (normalizedScore >= 75) return 'from-purple-600 to-violet-800';
  if (normalizedScore >= 50) return 'from-amber-500 to-orange-600';
  if (normalizedScore >= 25) return 'from-yellow-400 to-amber-500';
  return 'from-lime-400 to-green-500';
}

/**
 * Get label for metric based on score
 */
function getMetricLabel(type: 'clarity' | 'emotion' | 'nightmare', score: number): string {
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  if (type === 'clarity') {
    if (normalizedScore >= 80) return 'Crystal Clear';
    if (normalizedScore >= 60) return 'Vivid';
    if (normalizedScore >= 40) return 'Moderate';
    if (normalizedScore >= 20) return 'Fuzzy';
    return 'Hazy';
  }
  
  if (type === 'emotion') {
    if (normalizedScore >= 80) return 'Intense';
    if (normalizedScore >= 60) return 'Strong';
    if (normalizedScore >= 40) return 'Balanced';
    if (normalizedScore >= 20) return 'Mild';
    return 'Subtle';
  }
  
  // Nightmare
  if (normalizedScore >= 80) return 'Nightmare';
  if (normalizedScore >= 60) return 'Unsettling';
  if (normalizedScore >= 40) return 'Neutral';
  if (normalizedScore >= 20) return 'Peaceful';
  return 'Serene';
}

/**
 * Get tooltip description for each metric
 */
function getMetricDescription(type: 'clarity' | 'emotion' | 'nightmare'): string {
  switch (type) {
    case 'clarity':
      return 'Measures how vivid, detailed, and memorable your dream was. Higher scores indicate crystal-clear dream imagery.';
    case 'emotion':
      return 'Represents the emotional intensity of your dream. Higher scores mean stronger feelings experienced during the dream.';
    case 'nightmare':
      return 'Indicates the likelihood this was a nightmare or unsettling dream. Higher scores suggest more disturbing content.';
  }
}

/**
 * Individual Metric Badge Component
 */
interface MetricBadgeProps {
  type: 'clarity' | 'emotion' | 'nightmare';
  score: number;
  size: 'sm' | 'md' | 'lg';
  showTooltip: boolean;
  animated: boolean;
}

function MetricBadge({ type, score, size, showTooltip, animated }: MetricBadgeProps) {
  const [showDescription, setShowDescription] = useState(false);
  
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const gradient = getMetricGradient(type, normalizedScore);
  const label = getMetricLabel(type, normalizedScore);
  const description = getMetricDescription(type);
  
  // Size classes
  const sizeClasses = {
    sm: {
      container: 'px-2 py-1 min-w-[60px]',
      icon: 'w-3 h-3',
      value: 'text-sm',
      label: 'text-[10px]',
    },
    md: {
      container: 'px-3 py-1.5 min-w-[80px]',
      icon: 'w-4 h-4',
      value: 'text-base',
      label: 'text-xs',
    },
    lg: {
      container: 'px-4 py-2 min-w-[100px]',
      icon: 'w-5 h-5',
      value: 'text-xl',
      label: 'text-sm',
    },
  };
  
  const Icon = type === 'clarity' ? Eye : type === 'emotion' ? Heart : Moon;
  
  const badge = (
    <div
      className={`relative rounded-full bg-gradient-to-r ${gradient} ${sizeClasses[size].container} flex items-center gap-1.5 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer`}
      onMouseEnter={() => showTooltip && setShowDescription(true)}
      onMouseLeave={() => setShowDescription(false)}
    >
      <Icon className={`${sizeClasses[size].icon} text-white`} strokeWidth={2.5} />
      <div className="flex flex-col leading-none">
        <span className={`${sizeClasses[size].value} font-bold text-white`}>
          {animated ? (
            <AnimatedValue target={normalizedScore} suffix="" />
          ) : (
            normalizedScore
          )}
        </span>
        <span className={`${sizeClasses[size].label} text-white/90 font-medium`}>
          {label}
        </span>
      </div>
      
      {/* Tooltip */}
      {showTooltip && showDescription && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl z-50">
          <p className="text-xs text-white leading-relaxed">{description}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900/95 rotate-45" />
        </div>
      )}
    </div>
  );
  
  return badge;
}

/**
 * Animated number counter component
 */
function AnimatedValue({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  React.useEffect(() => {
    const duration = 1000; // 1 second animation
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (target - startValue) * eased);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [target]);
  
  return <>{displayValue}{suffix}</>;
}

/**
 * MetricBadges Component
 * 
 * Displays all three C/E/N metrics in a horizontal row with consistent styling.
 * Ideal for dream cards, detail views, and analytics dashboards.
 */
export function MetricBadges({
  metrics,
  size = 'md',
  showTooltips = true,
  className = '',
  animated = true,
}: MetricBadgesProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MetricBadge
        type="clarity"
        score={metrics.clarity}
        size={size}
        showTooltip={showTooltips}
        animated={animated}
      />
      <MetricBadge
        type="emotion"
        score={metrics.emotion}
        size={size}
        showTooltip={showTooltips}
        animated={animated}
      />
      <MetricBadge
        type="nightmare"
        score={metrics.nightmare}
        size={size}
        showTooltip={showTooltips}
        animated={animated}
      />
    </div>
  );
}

/**
 * Compact single-line metric display with C/E/N letters
 */
export function CompactMetrics({ metrics, className = '' }: { metrics: DreamMetrics; className?: string }) {
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    if (score >= 25) return 'text-orange-500';
    return 'text-red-500';
  };
  
  return (
    <div className={`flex items-center gap-3 text-xs font-medium ${className}`}>
      <div className="flex items-center gap-1">
        <Eye className="w-3 h-3 text-blue-500" />
        <span className={getScoreColor(metrics.clarity)}>{Math.round(metrics.clarity)}</span>
      </div>
      <div className="flex items-center gap-1">
        <Heart className="w-3 h-3 text-rose-500" />
        <span className={getScoreColor(metrics.emotion)}>{Math.round(metrics.emotion)}</span>
      </div>
      <div className="flex items-center gap-1">
        <Moon className="w-3 h-3 text-purple-500" />
        <span className={getScoreColor(metrics.nightmare)}>{Math.round(metrics.nightmare)}</span>
      </div>
    </div>
  );
}

/**
 * Detailed metrics panel with explanations
 */
export function MetricsPanel({ metrics, className = '' }: { metrics: DreamMetrics; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-cream p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink">Dream Quality Metrics</h4>
        <Info className="w-4 h-4 text-muted" />
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {/* Clarity */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-muted">Clarity</span>
          </div>
          <div className="text-2xl font-bold text-ink">{Math.round(metrics.clarity)}</div>
          <div className="text-[10px] text-muted mt-0.5">{getMetricLabel('clarity', metrics.clarity)}</div>
          <div className="mt-2 h-1.5 bg-line rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
              style={{ width: `${metrics.clarity}%` }}
            />
          </div>
        </div>
        
        {/* Emotion */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Heart className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-medium text-muted">Emotion</span>
          </div>
          <div className="text-2xl font-bold text-ink">{Math.round(metrics.emotion)}</div>
          <div className="text-[10px] text-muted mt-0.5">{getMetricLabel('emotion', metrics.emotion)}</div>
          <div className="mt-2 h-1.5 bg-line rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all"
              style={{ width: `${metrics.emotion}%` }}
            />
          </div>
        </div>
        
        {/* Nightmare */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-muted">Nightmare</span>
          </div>
          <div className="text-2xl font-bold text-ink">{Math.round(metrics.nightmare)}</div>
          <div className="text-[10px] text-muted mt-0.5">{getMetricLabel('nightmare', metrics.nightmare)}</div>
          <div className="mt-2 h-1.5 bg-line rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all"
              style={{ width: `${metrics.nightmare}%` }}
            />
          </div>
        </div>
      </div>
      
      <p className="text-[10px] text-muted text-center leading-relaxed pt-2 border-t border-line">
        These metrics help you understand patterns in your dream experiences over time.
      </p>
    </div>
  );
}

export default MetricBadges;
