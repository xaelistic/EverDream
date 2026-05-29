/**
 * Dream Analyzer — AI-Powered Dream Analysis Module
 *
 * Analyzes dream text using AI to extract:
 * - Category (nightmare, lucid, recurring, peaceful, prophetic, anxiety, adventure)
 * - Themes (flying, water, chase, death, etc.)
 * - Emotion (primary emotional tone)
 * - Symbols (key dream symbols)
 * - Narrative (expanded 200-word vivid retelling)
 * - Nugget (one captivating sentence)
 * - Interpretation (symbol meanings, psychological insight, common patterns)
 *
 * Uses the Supabase Edge Function `analyze-dream` as the primary provider,
 * with direct Anthropic API as fallback for development.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Supabase anon/public key
 *   VITE_ANTHROPIC_API_KEY  — Direct Anthropic key (dev fallback only)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────

export interface DreamAnalysis {
  category: string;
  themes: string[];
  emotion: string;
  symbols: string[];
  narrative: string;
  nugget: string;
  valence?: number;
  interpretation: {
    symbols: Record<string, string>;
    meaning: string;
    commonPattern: string;
  };
}

// ── Constants ────────────────────────────────────────────────

const FALLBACK_ANALYSIS: DreamAnalysis = {
  category: 'uncategorized',
  themes: ['dream', 'experience'],
  emotion: 'neutral',
  symbols: [],
  narrative: '',
  nugget: '',
  interpretation: {
    symbols: {},
    meaning: 'Analysis unavailable',
    commonPattern: '',
  },
};

const ANALYSIS_PROMPT = `Analyze this dream and provide a detailed response in JSON format:
{
  "category": "nightmare/lucid/recurring/peaceful/prophetic/anxiety/adventure",
  "themes": ["theme1", "theme2", "theme3"],
  "emotion": "primary emotional tone",
  "symbols": ["symbol1", "symbol2", "symbol3"],
  "narrative": "expanded 200-word vivid narrative in first person present tense",
  "nugget": "one captivating sentence (15-20 words)",
  "valence": -1.0 to 1.0 (negative to positive emotional tone),
  "interpretation": {
    "symbols": {
      "symbol1": "what it represents",
      "symbol2": "what it represents"
    },
    "meaning": "psychological insight about what this dream reveals",
    "commonPattern": "when people typically have dreams like this"
  }
}

Dream: {DREAM_TEXT}

Respond ONLY with valid JSON, no markdown.`;

// ── Supabase Client ──────────────────────────────────────────

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    return null;
  }

  _supabase = createClient(url, key);
  return _supabase;
}

// ── Analysis via Supabase Edge Function ──────────────────────

async function analyzeViaEdgeFunction(text: string): Promise<DreamAnalysis> {
  console.log('[DreamAnalyzer] Invoking Supabase analyze-dream edge function...');
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[DreamAnalyzer] Supabase not configured');
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase.functions.invoke('analyze-dream', {
    body: { text },
  });

  if (error) {
    console.error('[DreamAnalyzer] Edge function error:', error.message);
    throw new Error(error.message);
  }
  
  console.log('[DreamAnalyzer] Edge function response received');
  if (!data) {
    console.error('[DreamAnalyzer] No response data from edge function');
    throw new Error('No response from analysis service');
  }

  const responseData = data as { analysis?: DreamAnalysis; error?: string; fallback?: DreamAnalysis };

  if (responseData.error && responseData.fallback) {
    console.warn('[DreamAnalyzer] Edge function returned fallback due to error:', responseData.error);
    return responseData.fallback;
  }
  if (responseData.error) {
    console.error('[DreamAnalyzer] Edge function returned error:', responseData.error);
    throw new Error(responseData.error);
  }
  if (responseData.analysis) {
    console.log('[DreamAnalyzer] Analysis successful, category:', responseData.analysis.category);
    return responseData.analysis;
  }

  console.error('[DreamAnalyzer] Unexpected response format');
  throw new Error('Unexpected response format from analysis service');
}

// ── Analysis via Direct Anthropic API (Dev Fallback) ─────────

async function analyzeViaAnthropic(text: string): Promise<DreamAnalysis> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY not set');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: ANALYSIS_PROMPT.replace('{DREAM_TEXT}', text),
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.find((c: { type: string }) => c.type === 'text')?.text || '{}';
  const clean = content.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as DreamAnalysis;
}

// ── Main Analysis Function ────────────────────────────────────

/**
 * Analyze a dream text using AI.
 *
 * Tries Supabase Edge Function first (which handles multi-provider fallback),
 * then falls back to direct Anthropic API for development.
 *
 * @param text — The dream text to analyze (minimum 10 characters)
 * @returns Parsed DreamAnalysis, or fallback on failure
 *
 * @example
 * ```ts
 * const analysis = await analyzeDream('I was flying over a vast ocean...');
 * console.log(analysis.category); // 'adventure'
 * console.log(analysis.themes);   // ['freedom', 'exploration', 'water']
 * ```
 */
export async function analyzeDream(text: string): Promise<DreamAnalysis> {
  // Input validation
  if (!text || typeof text !== 'string') {
    console.warn('[DreamAnalyzer] Invalid input: text must be a non-empty string');
    return FALLBACK_ANALYSIS;
  }

  const trimmed = text.trim();
  if (trimmed.length < 10) {
    console.warn('[DreamAnalyzer] Text too short for meaningful analysis');
    return { ...FALLBACK_ANALYSIS, narrative: trimmed, nugget: trimmed.substring(0, 100) };
  }

  const safeText = trimmed.length > 10000 ? trimmed.substring(0, 10000) : trimmed;

  // Try Supabase Edge Function first
  try {
    console.log('[DreamAnalyzer] Trying Supabase Edge Function...');
    const result = await analyzeViaEdgeFunction(safeText);
    console.log('[DreamAnalyzer] Edge function succeeded:', result.category);
    return result;
  } catch (err) {
    console.warn('[DreamAnalyzer] Edge function failed:', err);
  }

  // Fallback: direct Anthropic API
  try {
    console.log('[DreamAnalyzer] Trying direct Anthropic API...');
    const result = await analyzeViaAnthropic(safeText);
    console.log('[DreamAnalyzer] Anthropic succeeded:', result.category);
    return result;
  } catch (err) {
    console.warn('[DreamAnalyzer] Anthropic failed:', err);
  }

  // All methods failed — return fallback
  console.error('[DreamAnalyzer] All analysis methods failed');
  return { ...FALLBACK_ANALYSIS, narrative: safeText, nugget: safeText.substring(0, 100) };
}
