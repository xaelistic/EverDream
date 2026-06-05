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
 * - Valence (emotional polarity -1 to 1)
 * - Interpretation (symbol meanings, psychological insight, common patterns)
 *
 * Uses the Supabase Edge Function `analyze-dream` as the primary provider.
 * All AI calls are routed through server-side edge functions to protect API keys.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Supabase anon/public key
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

const ANALYSIS_TIMEOUT_MS = 15000; // 15 second timeout

const FALLBACK_ANALYSIS: DreamAnalysis = {
  category: 'uncategorized',
  themes: ['dream', 'experience'],
  emotion: 'neutral',
  symbols: [],
  narrative: '',
  nugget: '',
  valence: 0,
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
  console.log('[DreamAnalyzer] Step 1: Input validation passed, text length:', text.length);
  console.log('[DreamAnalyzer] Step 2: Invoking Supabase analyze-dream edge function...');
  
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[DreamAnalyzer] Supabase not configured');
    throw new Error('Supabase not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

  try {
    const { data, error } = await supabase.functions.invoke('analyze-dream', {
      body: { text },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[DreamAnalyzer] Step 3: Edge function response received');

    if (error) {
      console.error('[DreamAnalyzer] Step 4: Edge function error:', error.message);
      throw new Error(error.message);
    }
    
    if (!data) {
      console.error('[DreamAnalyzer] Step 4: No response data from edge function');
      throw new Error('No response from analysis service');
    }

    const responseData = data as { analysis?: DreamAnalysis; error?: string; fallback?: DreamAnalysis };

    if (responseData.error && responseData.fallback) {
      console.warn('[DreamAnalyzer] Step 5: Edge function returned fallback due to error:', responseData.error);
      return validateAndNormalizeAnalysis(responseData.fallback);
    }
    if (responseData.error) {
      console.error('[DreamAnalyzer] Step 5: Edge function returned error:', responseData.error);
      throw new Error(responseData.error);
    }
    if (responseData.analysis) {
      console.log('[DreamAnalyzer] Step 6: Analysis successful, category:', responseData.analysis.category);
      return validateAndNormalizeAnalysis(responseData.analysis);
    }

    console.error('[DreamAnalyzer] Step 5: Unexpected response format');
    throw new Error('Unexpected response format from analysis service');
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[DreamAnalyzer] Step 4: Edge function timed out after', ANALYSIS_TIMEOUT_MS, 'ms');
      throw new Error(`Analysis timed out after ${ANALYSIS_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  }
}

// ── Main Analysis Function ────────────────────────────────────

/**
 * Validate and normalize analysis result to ensure all required fields exist.
 */
function validateAndNormalizeAnalysis(analysis: Partial<DreamAnalysis>): DreamAnalysis {
  console.log('[DreamAnalyzer] Validating and normalizing analysis result...');
  
  const normalized: DreamAnalysis = {
    category: analysis.category || FALLBACK_ANALYSIS.category,
    themes: Array.isArray(analysis.themes) && analysis.themes.length > 0 
      ? analysis.themes 
      : FALLBACK_ANALYSIS.themes,
    emotion: analysis.emotion || FALLBACK_ANALYSIS.emotion,
    symbols: Array.isArray(analysis.symbols) && analysis.symbols.length > 0 
      ? analysis.symbols 
      : [],
    narrative: analysis.narrative || '',
    nugget: analysis.nugget || '',
    valence: typeof analysis.valence === 'number' ? analysis.valence : 0,
    interpretation: {
      symbols: analysis.interpretation?.symbols || {},
      meaning: analysis.interpretation?.meaning || FALLBACK_ANALYSIS.interpretation.meaning,
      commonPattern: analysis.interpretation?.commonPattern || '',
    },
  };
  
  console.log('[DreamAnalyzer] Normalized analysis - category:', normalized.category, 
              '| themes count:', normalized.themes.length,
              '| symbols count:', normalized.symbols.length);
  
  return normalized;
}

/**
 * Analyze a dream text using AI.
 *
 * Uses Supabase Edge Function only - all API keys are server-side.
 * Supports multiple AI providers through the edge function:
 * OpenRouter (free), Pollinations (free), Gemini (free tier), 
 * OpenAI (cheap), and NVIDIA Nemotron (open source).
 *
 * @param text — The dream text to analyze (minimum 10 characters)
 * @returns Parsed DreamAnalysis, or fallback on failure
 */
export async function analyzeDream(text: string): Promise<DreamAnalysis> {
  console.log('[DreamAnalyzer] ========== DREAM ANALYSIS STARTED ==========');
  console.log('[DreamAnalyzer] Input text preview:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
  console.log('[DreamAnalyzer] Input text length:', text.length);
  
  // Input validation
  if (!text || typeof text !== 'string') {
    console.warn('[DreamAnalyzer] Invalid input: text must be a non-empty string');
    return FALLBACK_ANALYSIS;
  }

  const trimmed = text.trim();
  if (trimmed.length < 10) {
    console.warn('[DreamAnalyzer] Text too short for meaningful analysis (< 10 chars)');
    return { ...FALLBACK_ANALYSIS, narrative: trimmed, nugget: trimmed.substring(0, 100) };
  }

  const safeText = trimmed.length > 10000 ? trimmed.substring(0, 10000) : trimmed;
  console.log('[DreamAnalyzer] Safe text length after truncation:', safeText.length);

  // Try Supabase Edge Function ONLY - provider-agnostic, server-side API keys
  try {
    console.log('[DreamAnalyzer] Attempt 1: Trying Supabase Edge Function...');
    const result = await analyzeViaEdgeFunction(safeText);
    console.log('[DreamAnalyzer] ✓ Edge function succeeded');
    console.log('[DreamAnalyzer] ========== DREAM ANALYSIS COMPLETED ==========');
    return result;
  } catch (err) {
    console.warn('[DreamAnalyzer] ✗ Edge function failed:', err instanceof Error ? err.message : String(err));
  }

  // Return fallback analysis if edge function fails
  console.error('[DreamAnalyzer] ✗ Analysis failed, returning fallback');
  console.log('[DreamAnalyzer] ========== DREAM ANALYSIS COMPLETED (FALLBACK) ==========');
  return { ...FALLBACK_ANALYSIS, narrative: safeText, nugget: safeText.substring(0, 100) };
}
