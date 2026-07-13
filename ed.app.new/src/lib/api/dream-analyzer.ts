/**
 * Dream Analyzer — Multi-Provider AI Analysis Client
 *
 * Routes dream analysis through Supabase Edge Function "analyze-dream"
 * which handles provider fallback automatically (free → cheap → expensive).
 *
 * No API keys needed on the client side — all keys are server-side secrets.
 *
 * Environment variables (client-side, all optional):
 *   VITE_SUPABASE_URL       — Your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Your Supabase anon/public key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeDreamAnalysis } from '../normalizeDreamAnalysis';

// ── Types ────────────────────────────────────────────────────

export interface DreamAnalysis {
  category: string;
  themes: string[];
  emotion: string;
  symbols: string[];
  narrative: string;
  nugget: string;
  interpretation: {
    symbols: Record<string, string>;
    meaning: string;
    commonPattern: string;
  };
}

export interface AnalysisResult {
  analysis: DreamAnalysis;
  provider: string;
  model?: string;
  note?: string;
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

// ── Main Analysis Function ───────────────────────────────────

/**
 * Analyze a dream using the multi-provider edge function.
 * The edge function handles provider fallback automatically.
 *
 * @param text — The dream text to analyze (minimum 10 characters)
 * @returns Analysis result with provider info, or fallback on failure
 */
export async function analyzeDream(text: string): Promise<AnalysisResult> {
  if (!text || typeof text !== 'string') {
    return { analysis: FALLBACK_ANALYSIS, provider: 'none' };
  }

  const trimmed = text.trim();
  if (trimmed.length < 10) {
    return {
      analysis: { ...FALLBACK_ANALYSIS, narrative: trimmed, nugget: trimmed.substring(0, 100) },
      provider: 'none',
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      analysis: { ...FALLBACK_ANALYSIS, narrative: trimmed, nugget: trimmed.substring(0, 100) },
      provider: 'none',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('analyze-dream', {
      body: { text: trimmed },
    });

    if (error) {
      console.warn('[DreamAnalyzer] Edge function error:', error.message);
      return {
        analysis: { ...FALLBACK_ANALYSIS, narrative: trimmed, nugget: trimmed.substring(0, 100) },
        provider: 'none',
      };
    }

    const result = data as AnalysisResult;
    const normalized = normalizeDreamAnalysis(result.analysis || FALLBACK_ANALYSIS, trimmed);
    return {
      analysis: {
        ...FALLBACK_ANALYSIS,
        ...normalized,
        interpretation: {
          ...FALLBACK_ANALYSIS.interpretation,
          ...normalized.interpretation,
        },
      },
      provider: result.provider || 'unknown',
      model: result.model,
      note: result.note,
    };
  } catch (err) {
    console.error('[DreamAnalyzer] Analysis error:', err);
    return {
      analysis: { ...FALLBACK_ANALYSIS, narrative: trimmed, nugget: trimmed.substring(0, 100) },
      provider: 'none',
    };
  }
}

/**
 * Generate an image prompt from dream text.
 * Returns a prompt suitable for image generation APIs.
 */
export function generateImagePrompt(dreamText: string, style: string = 'dreamlike'): string {
  const styleMap: Record<string, string> = {
    dreamlike: 'surreal, ethereal, soft lighting, dreamlike atmosphere',
    realistic: 'photorealistic, detailed, natural lighting',
    artistic: 'oil painting style, impressionistic, vibrant colors',
    minimal: 'minimalist, clean lines, simple composition',
    cinematic: 'cinematic lighting, dramatic, wide angle, film grain',
  };

  const styleDesc = styleMap[style] || styleMap.dreamlike;
  return `${dreamText.substring(0, 200)}, ${styleDesc}, 4k, high quality`;
}
