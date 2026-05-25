/**
 * Dream Analysis Utility — C/E/N Metric Calculation & Facial Analysis Integration
 * 
 * This module provides:
 * - C/E/N (Clarity/Emotion/Nightmare) metric calculation from dream content
 * - Advanced XP scoring with Complexity, Intensity, Uniqueness factors
 * - Facial expression analysis integration for emotion detection
 * - AI-powered dream quality scoring
 * - Pattern recognition for recurring themes
 * 
 * @module dreamAnalysis
 */

import type { DreamAnalysis } from './dream-analyzer';
import type { EmotionCapture } from '../components/face/FacialEmotionDetector';

export interface DreamMetrics {
  /** Clarity score: 0-100 (vividness, detail, memorability) */
  clarity: number;
  /** Emotion score: 0-100 (emotional intensity) */
  emotion: number;
  /** Nightmare score: 0-100 (likelihood of being a nightmare) */
  nightmare: number;
}

/**
 * Advanced XP Scoring System - Hybrid Model
 * Combines simple C/E/N display with detailed backend scoring
 * 
 * C = Complexity (narrative richness, token diversity)
 * E = Emotional Intensity (valence × arousal × facial alignment)
 * N = Novelty/Uniqueness (rare themes, unique tokens, named entities)
 * 
 * Additional factors:
 * - Sleep Richness (REM/deep sleep ratio)
 * - User Resonance (self-reported significance)
 * - Social Factor (sharing potential)
 */
export interface XPScoreBreakdown {
  /** C_Raw: Sleep richness factor (0.2-1.2) based on REM/deep sleep */
  c_raw: number;
  /** R_User: User resonance score (0-1) */
  r_user: number;
  /** I_Semantic: Semantic intensity from token analysis */
  i_semantic: number;
  /** S_Valence: Valence multiplier (0.6-1.5) */
  s_valence: number;
  /** D_Density: Dream density factor (default 1) */
  d_density: number;
  /** M_Sustain: Memory sustain factor (default 1) */
  m_sustain: number;
  /** T_Social: Social sharing score (0.5-2) */
  t_social: number;
  /** Raw token count */
  token_count: number;
  /** Unique token count */
  unique_token_count: number;
  /** Named entity count */
  named_entity_count: number;
  /** Final XP score (0-500+) */
  xp_score: number;
  /** CEN breakdown for UI display */
  cen_metrics: {
    complexity: number;
    intensity: number;
    novelty: number;
  };
}

export interface DetailedMetrics extends DreamMetrics {
  /** Breakdown of clarity factors */
  clarityBreakdown: {
    vividness: number;
    detail: number;
    coherence: number;
  };
  /** Breakdown of emotion factors */
  emotionBreakdown: {
    intensity: number;
    variety: number;
    facialAlignment: number;
  };
  /** Breakdown of nightmare factors */
  nightmareBreakdown: {
    fearIndicators: number;
    threatLevel: number;
    negativeEmotions: number;
  };
  /** Confidence score for the metrics (0-1) */
  confidence: number;
  /** Advanced XP scoring breakdown */
  xpBreakdown?: XPScoreBreakdown;
}

/**
 * Sleep session data for richness calculation
 */
export interface SleepSessionData {
  total_sleep_minutes: number;
  rem_minutes: number;
  deep_minutes: number;
  light_minutes: number;
  awake_minutes: number;
}

/**
 * Common dream themes for semantic analysis
 */
const THEME_DICTIONARY = [
  'water', 'flying', 'chased', 'fire', 'forest', 'ocean', 'home', 'door',
  'mirror', 'train', 'station', 'mother', 'father', 'child', 'animal',
  'moon', 'shadow', 'city', 'garden', 'school', 'bridge', 'river',
  'light', 'stairs', 'storm', 'falling', 'teeth', 'naked', 'late',
  'exam', 'baby', 'snake', 'spider', 'death', 'wedding', 'funeral',
];

/**
 * Calculate sleep richness from sleep session data
 * Based on REM and deep sleep ratios
 */
export function calculateSleepRichness(session: SleepSessionData | null): number {
  if (!session || session.total_sleep_minutes === 0) {
    return 0.55; // Default neutral value
  }

  const totalSleep = Math.max(session.total_sleep_minutes, 1);
  const remRatio = session.rem_minutes / totalSleep;
  const deepRatio = session.deep_minutes / totalSleep;
  
  // REM sleep strongly correlates with dream vividness
  // Deep sleep contributes to memory consolidation
  return clamp(remRatio * 0.8 + deepRatio * 0.5 + 0.25, 0.2, 1.2);
}

/**
 * Tokenize narrative text for analysis
 */
export function tokenizeNarrative(narrative: string): string[] {
  return narrative
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
}

/**
 * Infer named entity count from capitalization patterns
 */
export function inferNamedEntityCount(narrative: string): number {
  const matches = narrative.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  return new Set(matches).size;
}

/**
 * Suggest themes from narrative text
 */
export function suggestThemesFromNarrative(narrative: string): string[] {
  const lower = narrative.toLowerCase();
  const matchedThemes = THEME_DICTIONARY.filter(theme => lower.includes(theme));

  if (matchedThemes.length >= 3) {
    return matchedThemes.slice(0, 3);
  }

  const tokens = tokenizeNarrative(narrative)
    .map(token => token.toLowerCase())
    .filter(token => token.length >= 5);
    
  const tokenCounts = tokens.reduce<Record<string, number>>((acc, token) => {
    acc[token] = (acc[token] ?? 0) + 1;
    return acc;
  }, {});

  const frequentTokens = Object.entries(tokenCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token)
    .filter(token => !matchedThemes.includes(token));

  return [...matchedThemes, ...frequentTokens].slice(0, 3);
}

/**
 * Calculate semantic intensity from dream content
 */
export function calculateSemanticIntensity(
  dreamText: string,
  themeCount: number
): { tokenCount: number; uniqueTokenCount: number; namedEntityCount: number; intensity: number } {
  const tokens = tokenizeNarrative(dreamText);
  const uniqueTokenCount = new Set(tokens.map(t => t.toLowerCase())).size;
  const namedEntityCount = inferNamedEntityCount(dreamText);
  
  const base = tokens.length / 140 + uniqueTokenCount / 240 + namedEntityCount * 0.08 + themeCount * 0.05;
  
  return {
    tokenCount: tokens.length,
    uniqueTokenCount,
    namedEntityCount,
    intensity: clamp(0.2 + base, 0.15, 1.35),
  };
}

/**
 * Calculate valence multiplier from emotional state
 */
export function calculateValenceMultiplier(valence: number, arousal: number): number {
  const valenceWeight = Math.abs(valence) / 10;
  const arousalWeight = arousal / 20;
  return clamp(0.8 + valenceWeight + arousalWeight, 0.6, 1.5);
}

/**
 * Calculate advanced XP score with full breakdown
 * This is the hybrid scoring system combining old reference formula with C/E/N display
 */
export interface XPScoringInputs {
  dreamText: string;
  sleepSession?: SleepSessionData | null;
  resonanceScore: number; // User-rated significance (0-1)
  valence: number; // -10 to 10
  arousal: number; // 0-20
  themeCount: number;
  tSocialScore?: number; // Social factor (default 1)
}

export function calculateXPScore(inputs: XPScoringInputs): XPScoreBreakdown {
  const c_raw = calculateSleepRichness(inputs.sleepSession ?? null);
  const r_user = clamp(inputs.resonanceScore, 0, 1);
  const semantic = calculateSemanticIntensity(inputs.dreamText, inputs.themeCount);
  const s_valence = calculateValenceMultiplier(inputs.valence, inputs.arousal);
  const d_density = 1;
  const m_sustain = 1;
  const t_social = clamp(inputs.tSocialScore ?? 1, 0.5, 2);
  
  // XP formula: multiplicative model with all factors
  const xp_score = Number(((c_raw * r_user * semantic.intensity) * s_valence * d_density * m_sustain * t_social * 100).toFixed(2));
  
  // Derive C/E/N (Complexity/Intensity/Novelty) for UI display
  const cen_metrics = {
    complexity: Math.round(clamp((semantic.tokenCount / 200 + semantic.uniqueTokenCount / 100) * 50, 0, 100)),
    intensity: Math.round(clamp(s_valence * 60 + (inputs.arousal / 20) * 40, 0, 100)),
    novelty: Math.round(clamp((semantic.namedEntityCount / 10 + semantic.uniqueTokenCount / 50) * 50, 0, 100)),
  };

  return {
    c_raw: Number(c_raw.toFixed(3)),
    r_user: Number(r_user.toFixed(3)),
    i_semantic: Number(semantic.intensity.toFixed(3)),
    s_valence: Number(s_valence.toFixed(3)),
    d_density,
    m_sustain,
    t_social: Number(t_social.toFixed(3)),
    token_count: semantic.tokenCount,
    unique_token_count: semantic.uniqueTokenCount,
    named_entity_count: semantic.namedEntityCount,
    xp_score,
    cen_metrics,
  };
}

/**
 * Utility function to clamp values
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Keywords that indicate high clarity dreams
 */
const CLARITY_KEYWORDS = [
  'vivid', 'clear', 'bright', 'detailed', 'sharp', 'focused', 'crystal',
  'remember', 'recall', 'see', 'watch', 'observe', 'notice', 'aware',
  'specific', 'distinct', 'precise', 'defined', 'colorful', 'realistic',
];

/**
 * Keywords that indicate low clarity dreams
 */
const FUZZY_KEYWORDS = [
  'blurry', 'fuzzy', 'unclear', 'vague', 'hazy', 'foggy', 'dim',
  'forget', 'fade', 'disappear', 'uncertain', 'maybe', 'perhaps',
  'indistinct', 'shadowy', 'murky', 'obscure', 'confused',
];

/**
 * Emotional keywords with intensity scores
 */
const EMOTION_KEYWORDS: Record<string, number> = {
  // High intensity emotions (80-100)
  'terrified': 95, 'ecstatic': 95, 'devastated': 95, 'furious': 90, 'euphoric': 90,
  'horrified': 90, 'overwhelmed': 85, 'panicked': 85, 'thrilled': 85, 'heartbroken': 85,
  
  // Medium-high intensity (60-79)
  'scared': 75, 'excited': 75, 'angry': 70, 'joyful': 70, 'sad': 70,
  'anxious': 70, 'nervous': 65, 'happy': 65, 'worried': 65, 'frustrated': 65,
  
  // Medium intensity (40-59)
  'surprised': 55, 'curious': 50, 'interested': 50, 'concerned': 50,
  'content': 45, 'relaxed': 45, 'uneasy': 45, 'restless': 45,
  
  // Low intensity (20-39)
  'calm': 35, 'peaceful': 35, 'neutral': 30, 'okay': 30, 'fine': 25,
  'tired': 30, 'sleepy': 25, 'bored': 30,
};

/**
 * Nightmare indicator keywords
 */
const NIGHTMARE_KEYWORDS = [
  'nightmare', 'terror', 'horror', 'monster', 'demon', 'ghost', 'death',
  'chase', 'attack', 'threat', 'danger', 'escape', 'trapped', 'falling',
  'drowning', 'suffocating', 'paralyzed', 'frozen', 'screaming', 'crying',
  'darkness', 'shadow', 'evil', 'menacing', 'sinister', 'grotesque',
  'blood', 'violence', 'weapon', 'killer', 'predator', 'hunt',
];

/**
 * Calculate C/E/N metrics from dream text and analysis
 */
export function calculateDreamMetrics(
  dreamText: string,
  analysis?: DreamAnalysis,
  facialEmotions?: EmotionCapture[]
): DetailedMetrics {
  const text = dreamText.toLowerCase();
  const words = text.split(/\s+/);
  
  // ── CLARITY CALCULATION ───────────────────────────────────────
  
  let vividnessScore = 50; // Base score
  let detailScore = 50;
  let coherenceScore = 50;
  
  // Count clarity indicators
  const clarityMatches = words.filter(w => CLARITY_KEYWORDS.some(k => w.includes(k)));
  const fuzzyMatches = words.filter(w => FUZZY_KEYWORDS.some(k => w.includes(k)));
  
  vividnessScore += (clarityMatches.length * 8) - (fuzzyMatches.length * 10);
  
  // Analyze sentence structure for coherence
  const sentences = dreamText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((acc, s) => acc + s.split(' ').length, 0) / sentences.length || 1;
  
  // Optimal sentence length is 10-20 words
  if (avgSentenceLength >= 10 && avgSentenceLength <= 20) {
    coherenceScore = 75;
  } else if (avgSentenceLength < 5) {
    coherenceScore = 40; // Too fragmented
  } else if (avgSentenceLength > 30) {
    coherenceScore = 45; // Run-on sentences suggest confusion
  }
  
  // Check for sensory details
  const sensoryWords = ['see', 'hear', 'feel', 'touch', 'smell', 'taste', 'look', 'sound'];
  const sensoryCount = sensoryWords.filter(w => text.includes(w)).length;
  detailScore += Math.min(30, sensoryCount * 6);
  
  // Use AI analysis if available
  if (analysis?.themes && analysis.themes.length > 0) {
    detailScore += Math.min(20, analysis.themes.length * 3);
  }
  
  if (analysis?.narrative && analysis.narrative.length > 200) {
    vividnessScore += 10; // Detailed narrative suggests clarity
  }
  
  // Normalize clarity scores
  vividnessScore = Math.max(0, Math.min(100, vividnessScore));
  detailScore = Math.max(0, Math.min(100, detailScore));
  coherenceScore = Math.max(0, Math.min(100, coherenceScore));
  
  const clarity = (vividnessScore * 0.4) + (detailScore * 0.35) + (coherenceScore * 0.25);
  
  // ── EMOTION CALCULATION ───────────────────────────────────────
  
  let intensityScore = 30; // Base score
  let varietyScore = 0;
  let facialAlignmentScore = 50;
  
  // Score emotions from keywords
  const foundEmotions: string[] = [];
  let totalEmotionIntensity = 0;
  let emotionCount = 0;
  
  Object.entries(EMOTION_KEYWORDS).forEach(([emotion, intensity]) => {
    if (text.includes(emotion)) {
      foundEmotions.push(emotion);
      totalEmotionIntensity += intensity;
      emotionCount++;
    }
  });
  
  if (emotionCount > 0) {
    intensityScore = totalEmotionIntensity / emotionCount;
    varietyScore = Math.min(100, emotionCount * 15); // More emotions = more variety
  }
  
  // Incorporate facial emotion data if available
  if (facialEmotions && facialEmotions.length > 0) {
    const dominantEmotions = facialEmotions.map(e => e.dominantEmotion);
    const uniqueFacialEmotions = new Set(dominantEmotions);
    
    // High facial emotion variety increases score
    varietyScore = Math.max(varietyScore, uniqueFacialEmotions.size * 20);
    
    // Align with detected emotions
    const strongFacialEmotions = facialEmotions.filter(e => e.confidence > 0.7);
    if (strongFacialEmotions.length > 0) {
      facialAlignmentScore = 70 + (strongFacialEmotions.length * 5);
      intensityScore = Math.max(intensityScore, 60); // Facial detection suggests real emotion
    }
  }
  
  // Use AI valence if available
  if (analysis?.valence !== undefined) {
    // Valence is -1 to 1, convert to intensity (absolute value)
    const valenceIntensity = Math.abs(analysis.valence) * 50 + 50;
    intensityScore = (intensityScore * 0.6) + (valenceIntensity * 0.4);
  }
  
  // Normalize emotion scores
  intensityScore = Math.max(0, Math.min(100, intensityScore));
  varietyScore = Math.max(0, Math.min(100, varietyScore));
  facialAlignmentScore = Math.max(0, Math.min(100, facialAlignmentScore));
  
  const emotion = (intensityScore * 0.5) + (varietyScore * 0.3) + (facialAlignmentScore * 0.2);
  
  // ── NIGHTMARE CALCULATION ───────────────────────────────────────
  
  let fearScore = 0;
  let threatScore = 0;
  let negativeEmotionScore = 0;
  
  // Count nightmare keywords
  const nightmareMatches = words.filter(w => NIGHTMARE_KEYWORDS.some(k => w.includes(k)));
  fearScore = Math.min(100, nightmareMatches.length * 12);
  
  // Check for threat scenarios
  const threatPhrases = ['running away', 'being chased', 'can\'t escape', 'helpless', 'in danger', 'going to die'];
  const threatMatches = threatPhrases.filter(p => text.includes(p));
  threatScore = Math.min(100, threatMatches.length * 15);
  
  // Check for negative emotions
  const negativeEmotions = ['terrified', 'horrified', 'panicked', 'devastated', 'heartbroken', 'furious'];
  const negativeMatches = negativeEmotions.filter(e => text.includes(e));
  negativeEmotionScore = Math.min(100, negativeMatches.length * 18);
  
  // Use AI category if available
  if (analysis?.category) {
    if (analysis.category === 'nightmare') {
      fearScore = Math.max(fearScore, 80);
      threatScore = Math.max(threatScore, 75);
    } else if (analysis.category === 'anxiety') {
      fearScore = Math.max(fearScore, 60);
    }
  }
  
  // Use AI emotion if available
  if (analysis?.emotion) {
    const aiEmotion = analysis.emotion.toLowerCase();
    if (['fear', 'terror', 'anxiety', 'panic'].some(e => aiEmotion.includes(e))) {
      negativeEmotionScore = Math.max(negativeEmotionScore, 70);
    }
  }
  
  // Normalize nightmare scores
  fearScore = Math.max(0, Math.min(100, fearScore));
  threatScore = Math.max(0, Math.min(100, threatScore));
  negativeEmotionScore = Math.max(0, Math.min(100, negativeEmotionScore));
  
  const nightmare = (fearScore * 0.35) + (threatScore * 0.35) + (negativeEmotionScore * 0.3);
  
  // ── CONFIDENCE CALCULATION ───────────────────────────────────────
  
  let confidence = 0.5; // Base confidence
  
  // More text = higher confidence
  if (dreamText.length > 200) confidence += 0.15;
  else if (dreamText.length > 100) confidence += 0.1;
  
  // AI analysis available = higher confidence
  if (analysis) confidence += 0.15;
  
  // Facial data available = higher confidence
  if (facialEmotions && facialEmotions.length > 0) confidence += 0.1;
  
  // Multiple emotion keywords = higher confidence
  if (emotionCount >= 3) confidence += 0.1;
  
  confidence = Math.min(1, confidence);
  
  // Calculate XP breakdown if we have enough data
  const themeCount = analysis?.themes?.length ?? suggestThemesFromNarrative(dreamText).length;
  const xpBreakdown = calculateXPScore({
    dreamText,
    resonanceScore: confidence, // Use confidence as proxy for user resonance
    valence: analysis?.valence !== undefined ? analysis.valence * 10 : 0,
    arousal: analysis?.arousal !== undefined ? analysis.arousal * 2 : 10,
    themeCount,
  });
  
  return {
    clarity: Math.round(clarity * 10) / 10,
    emotion: Math.round(emotion * 10) / 10,
    nightmare: Math.round(nightmare * 10) / 10,
    clarityBreakdown: {
      vividness: Math.round(vividnessScore),
      detail: Math.round(detailScore),
      coherence: Math.round(coherenceScore),
    },
    emotionBreakdown: {
      intensity: Math.round(intensityScore),
      variety: Math.round(varietyScore),
      facialAlignment: Math.round(facialAlignmentScore),
    },
    nightmareBreakdown: {
      fearIndicators: Math.round(fearScore),
      threatLevel: Math.round(threatScore),
      negativeEmotions: Math.round(negativeEmotionScore),
    },
    confidence: Math.round(confidence * 100) / 100,
    xpBreakdown,
  };
}

/**
 * Quick metric estimation without full analysis
 */
export function quickEstimateMetrics(dreamText: string): DreamMetrics {
  const detailed = calculateDreamMetrics(dreamText);
  return {
    clarity: detailed.clarity,
    emotion: detailed.emotion,
    nightmare: detailed.nightmare,
  };
}

/**
 * Get overall dream quality score from metrics
 */
export function getDreamQualityScore(metrics: DreamMetrics): number {
  // High clarity and emotion are good, moderate nightmare can be interesting
  // Very high nightmare scores reduce quality
  const nightmarePenalty = metrics.nightmare > 70 ? (metrics.nightmare - 70) * 0.5 : 0;
  
  const quality = (metrics.clarity * 0.4) + (metrics.emotion * 0.4) - nightmarePenalty + 20;
  return Math.max(0, Math.min(100, Math.round(quality)));
}

/**
 * Get dream type classification based on metrics
 */
export function classifyDreamType(metrics: DreamMetrics): string {
  const { clarity, emotion, nightmare } = metrics;
  
  if (nightmare >= 70) {
    if (clarity >= 70) return 'Lucid Nightmare';
    return 'Classic Nightmare';
  }
  
  if (clarity >= 80 && emotion >= 60) {
    if (emotion >= 80) return 'Intense Lucid Dream';
    return 'Clear Lucid Dream';
  }
  
  if (emotion >= 75 && nightmare < 30) {
    return 'Positive Emotional Dream';
  }
  
  if (clarity < 40 && emotion < 40) {
    return 'Fleeting Dream';
  }
  
  if (nightmare < 25 && emotion < 40) {
    return 'Peaceful Dream';
  }
  
  return 'Standard Dream';
}

/**
 * Generate insight text from metrics
 */
export function generateMetricInsight(metrics: DreamMetrics): string {
  const insights: string[] = [];
  
  if (metrics.clarity >= 80) {
    insights.push('Exceptionally vivid and memorable dream');
  } else if (metrics.clarity <= 30) {
    insights.push('Consider journaling immediately upon waking to capture more details');
  }
  
  if (metrics.emotion >= 75) {
    insights.push('Strong emotional content—this dream may have psychological significance');
  } else if (metrics.emotion <= 25) {
    insights.push('Low emotional intensity suggests a processing or mundane dream');
  }
  
  if (metrics.nightmare >= 70) {
    insights.push('Nightmare indicators detected—consider stress management techniques before sleep');
  } else if (metrics.nightmare <= 20) {
    insights.push('Peaceful dream content promotes restful sleep');
  }
  
  if (insights.length === 0) {
    insights.push('Balanced dream experience with moderate characteristics across all dimensions');
  }
  
  return insights.join('. ') + '.';
}

/**
 * Get XP insight from advanced scoring
 */
export function generateXPInsight(xpBreakdown: XPScoreBreakdown): string {
  const insights: string[] = [];
  
  if (xpBreakdown.cen_metrics.complexity >= 70) {
    insights.push('Highly complex narrative with rich detail');
  } else if (xpBreakdown.cen_metrics.complexity <= 30) {
    insights.push('Simple, straightforward dream narrative');
  }
  
  if (xpBreakdown.cen_metrics.intensity >= 70) {
    insights.push('Intense emotional experience');
  }
  
  if (xpBreakdown.cen_metrics.novelty >= 70) {
    insights.push('Unique and original dream content');
  }
  
  if (xpBreakdown.xp_score >= 300) {
    insights.push(`Exceptional dream worth ${xpBreakdown.xp_score} XP!`);
  }
  
  if (insights.length === 0) {
    insights.push('Standard dream experience');
  }
  
  return insights.join('. ') + '.';
}

/**
 * Merge JSON objects safely
 */
export function mergeJsonObject(base: unknown, patch: Record<string, unknown>): Record<string, unknown> {
  if (!base || typeof base !== 'object' || Array.isArray(base)) {
    return patch;
  }
  
  return {
    ...base,
    ...patch,
  };
}

export default {
  calculateDreamMetrics,
  quickEstimateMetrics,
  getDreamQualityScore,
  classifyDreamType,
  generateMetricInsight,
  generateXPInsight,
  calculateXPScore,
  calculateSleepRichness,
  tokenizeNarrative,
  inferNamedEntityCount,
  suggestThemesFromNarrative,
  calculateSemanticIntensity,
  calculateValenceMultiplier,
  mergeJsonObject,
};
