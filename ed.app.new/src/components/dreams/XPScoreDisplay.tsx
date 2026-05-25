/**
 * XPScoreDisplay — Advanced Dream Scoring Component
 * 
 * Displays the hybrid XP scoring system with:
 * - C/E/N (Complexity/Emotion/Novelty) metrics
 * - Detailed breakdown of scoring factors
 * - XP score with level progression
 * - Sleep richness indicators
 * 
 * This bridges the simple C/E/N UI badges with the detailed backend scoring formula.
 */

import React, { useState } from 'react';
import { 
  TrendingUp, Zap, Brain, Heart, Sparkles, 
  Moon, Sun, Clock, Award, ChevronDown, ChevronUp,
  Info
} from 'lucide-react';
import type { XPScoreBreakdown } from '../../utils/dreamAnalysis';

export interface XPScoreDisplayProps {
  /** XP score breakdown from calculateXPScore */
  xpBreakdown: XPScoreBreakdown;
  /** Show detailed breakdown */
  showDetails?: boolean;
  /** Size variant */
  size?: 'compact' | 'normal' | 'detailed';
  /** Custom className */
  className?: string;
}

/**
 * Get level from XP score (gamification)
 */
function getLevelFromXP(xpScore: number): number {
  // Simple leveling: every 100 XP = 1 level
  return Math.floor(xpScore / 100) + 1;
}

/**
 * Get progress to next level
 */
function getLevelProgress(xpScore: number): number {
  const currentLevel = getLevelFromXP(xpScore);
  const xpForCurrentLevel = (currentLevel - 1) * 100;
  const xpForNextLevel = currentLevel * 100;
  return ((xpScore - xpForCurrentLevel) / 100) * 100;
}

/**
 * Get color for metric score
 */
function getScoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-500';
  if (score >= 50) return 'text-amber-500';
  if (score >= 25) return 'text-orange-500';
  return 'text-red-400';
}

/**
 * Get gradient for metric bar
 */
function getScoreGradient(score: number): string {
  if (score >= 75) return 'from-emerald-400 to-green-500';
  if (score >= 50) return 'from-amber-400 to-orange-500';
  if (score >= 25) return 'from-orange-400 to-red-500';
  return 'from-red-400 to-rose-600';
}

/**
 * Compact C/E/N display for dream cards
 */
export function CompactCEN({ xpBreakdown }: { xpBreakdown: XPScoreBreakdown }) {
  const { cen_metrics } = xpBreakdown;
  
  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <div className="flex items-center gap-1" title="Complexity">
        <Brain className="w-3 h-3 text-purple-500" />
        <span className={getScoreColor(cen_metrics.complexity)}>
          {cen_metrics.complexity}
        </span>
      </div>
      <div className="flex items-center gap-1" title="Intensity">
        <Zap className="w-3 h-3 text-yellow-500" />
        <span className={getScoreColor(cen_metrics.intensity)}>
          {cen_metrics.intensity}
        </span>
      </div>
      <div className="flex items-center gap-1" title="Novelty">
        <Sparkles className="w-3 h-3 text-blue-500" />
        <span className={getScoreColor(cen_metrics.novelty)}>
          {cen_metrics.novelty}
        </span>
      </div>
    </div>
  );
}

/**
 * XP Badge with level indicator
 */
function XPBadge({ xpScore }: { xpScore: number }) {
  const level = getLevelFromXP(xpScore);
  const progress = getLevelProgress(xpScore);
  
  return (
    <div className="relative group">
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl border border-purple-500/20">
        <Award className="w-5 h-5 text-purple-500" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-purple-600">{xpScore} XP</span>
          <span className="text-[10px] text-purple-400">Level {level}</span>
        </div>
      </div>
      
      {/* Progress bar to next level */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-xl overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Tooltip */}
      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl z-50 pointer-events-none">
        <p className="text-xs text-white">
          Level {level} Dreamer
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          {Math.round(progress)}% to Level {level + 1}
        </p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900/95 rotate-45" />
      </div>
    </div>
  );
}

/**
 * Main XP Score Display Component
 */
export function XPScoreDisplay({
  xpBreakdown,
  showDetails = false,
  size = 'normal',
  className = '',
}: XPScoreDisplayProps) {
  const [expanded, setExpanded] = useState(showDetails);
  
  const { cen_metrics, xp_score, c_raw, r_user, i_semantic, s_valence, token_count, unique_token_count, named_entity_count } = xpBreakdown;
  
  if (size === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <CompactCEN xpBreakdown={xpBreakdown} />
        <XPBadge xpScore={xp_score} />
      </div>
    );
  }
  
  return (
    <div className={`rounded-2xl border border-line bg-cream overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-line bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Dream Score</h3>
              <p className="text-[10px] text-muted">Powered by AI Analysis</p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted" />
            )}
          </button>
        </div>
        
        {/* C/E/N Metrics */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {/* Complexity */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Brain className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] font-medium text-muted">Complexity</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(cen_metrics.complexity)}`}>
              {cen_metrics.complexity}
            </div>
            <div className="mt-1.5 h-1.5 bg-line rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${getScoreGradient(cen_metrics.complexity)} rounded-full transition-all`}
                style={{ width: `${cen_metrics.complexity}%` }}
              />
            </div>
          </div>
          
          {/* Intensity */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-[10px] font-medium text-muted">Intensity</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(cen_metrics.intensity)}`}>
              {cen_metrics.intensity}
            </div>
            <div className="mt-1.5 h-1.5 bg-line rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${getScoreGradient(cen_metrics.intensity)} rounded-full transition-all`}
                style={{ width: `${cen_metrics.intensity}%` }}
              />
            </div>
          </div>
          
          {/* Novelty */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-medium text-muted">Novelty</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(cen_metrics.novelty)}`}>
              {cen_metrics.novelty}
            </div>
            <div className="mt-1.5 h-1.5 bg-line rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${getScoreGradient(cen_metrics.novelty)} rounded-full transition-all`}
                style={{ width: `${cen_metrics.novelty}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* XP Score */}
        <div className="mt-4 flex items-center justify-center">
          <XPBadge xpScore={xp_score} />
        </div>
      </div>
      
      {/* Detailed Breakdown */}
      {expanded && (
        <div className="p-4 space-y-4 bg-white/50">
          {/* Scoring Factors */}
          <div>
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Scoring Factors
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-ink">Sleep Richness (C)</span>
                </div>
                <span className="font-mono text-muted">{c_raw.toFixed(3)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-ink">User Resonance (R)</span>
                </div>
                <span className="font-mono text-muted">{r_user.toFixed(3)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-ink">Semantic Intensity (I)</span>
                </div>
                <span className="font-mono text-muted">{i_semantic.toFixed(3)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-ink">Valence Multiplier (S)</span>
                </div>
                <span className="font-mono text-muted">{s_valence.toFixed(3)}</span>
              </div>
            </div>
          </div>
          
          {/* Text Analysis */}
          <div className="pt-3 border-t border-line">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Text Analysis
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-white rounded-lg">
                <div className="text-lg font-bold text-ink">{token_count}</div>
                <div className="text-[10px] text-muted">Tokens</div>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <div className="text-lg font-bold text-ink">{unique_token_count}</div>
                <div className="text-[10px] text-muted">Unique</div>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <div className="text-lg font-bold text-ink">{named_entity_count}</div>
                <div className="text-[10px] text-muted">Entities</div>
              </div>
            </div>
          </div>
          
          {/* Formula */}
          <div className="pt-3 border-t border-line">
            <div className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
              <Info className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-purple-700 leading-relaxed">
                XP = (C × R × I × S × D × M × T) × 100
                <br />
                <span className="opacity-70">
                  Where C=sleep richness, R=resonance, I=semantic intensity, 
                  S=valence multiplier, D=density, M=sustain, T=social factor
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default XPScoreDisplay;
