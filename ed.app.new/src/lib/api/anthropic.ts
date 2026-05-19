/**
 * Anthropic API Client — Supabase Edge Function Proxy
 *
 * Routes all AI dream analysis through the Supabase Edge Function
 * `analyze-dream` instead of calling Anthropic directly from the client.
 * This keeps the API key server-side and avoids CORS issues.
 *
 * Includes rate limiting, retry logic, and user-friendly error handling.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Your Supabase anon/public key
 *
 * BUG-001 FIX: No longer calls api.anthropic.com from the browser.
 * All requests go through supabase.functions.invoke('analyze-dream').
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Inline Rate Limiter ───────────────────────────────────────

const analysisCalls: number[] = [];
const ANALYSIS_MAX_CALLS = 5;
const ANALYSIS_WINDOW_MS = 30_000;

function isAnalysisAllowed(): boolean {
  const now = Date.now();
  const valid = analysisCalls.filter((t) => now - t < ANALYSIS_WINDOW_MS);
  if (valid.length >= ANALYSIS_MAX_CALLS) return false;
  analysisCalls.push(now);
  while (analysisCalls.length > 0 && now - analysisCalls[0] > ANALYSIS_WINDOW_MS) {
    analysisCalls.shift();
  }
  return true;
}

// ── Inline API Error ─────────────────────────────────────────

export class ApiError extends Error {
  public readonly category: 'network' | 'rate_limit' | 'auth' | 'server' | 'validation' | 'unknown';
  public readonly isRetryable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    category: 'network' | 'rate_limit' | 'auth' | 'server' | 'validation' | 'unknown' = 'unknown'
  ) {
    super(message);
    this.name = 'ApiError';
    this.category = category;
    this.isRetryable = category === 'network' || category === 'rate_limit' || category === 'server';
    this.userMessage = ApiError.getUserMessage(category);
  }

  static getUserMessage(category: string): string {
    switch (category) {
      case 'network': return 'Unable to connect. Please check your internet connection and try again.';
      case 'rate_limit': return 'Too many requests. Please wait a moment and try again.';
      case 'auth': return 'Authentication failed. Please sign in again.';
      case 'server': return 'The AI service is temporarily unavailable. Please try again in a moment.';
      case 'validation': return 'The request was invalid. Please check your input and try again.';
      default: return 'Something unexpected happened. Please try again.';
    }
  }
}

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

export interface AnalysisError {
  error: string;
  fallback: DreamAnalysis;
}

export interface AnalysisResult {
  analysis: DreamAnalysis;
  provider: string;
  model?: string;
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

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

// ── Supabase Client ──────────────────────────────────────────

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    console.warn('[AI] Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    return null;
  }

  _supabase = createClient(url, key);
  return _supabase;
}

// ── Retry Helper ─────────────────────────────────────────────

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main Analysis Function ───────────────────────────────────

/**
 * Analyze a dream using Claude AI via Supabase Edge Function.
 *
 * Includes rate limiting (5 calls per 30s) and automatic retry
 * with exponential backoff on transient failures.
 *
 * @param text — The dream text to analyze (minimum 10 characters)
 * @returns Parsed DreamAnalysis, or fallback on failure
 *
 * @example
 * ```ts
 * const analysis = await analyzeDreamWithAI('I was flying over a vast ocean...');
 * console.log(analysis.category); // 'adventure'
 * console.log(analysis.themes);   // ['freedom', 'exploration', 'water']
 * ```
 */
export async function analyzeDreamWithAI(text: string): Promise<DreamAnalysis> {
  // Input validation
  if (!text || typeof text !== 'string') {
    console.warn('[AI] Invalid input: text must be a non-empty string');
    return FALLBACK_ANALYSIS;
  }

  const trimmed = text.trim();
  if (trimmed.length < 10) {
    console.warn('[AI] Text too short for meaningful analysis');
    return { ...FALLBACK_ANALYSIS, narrative: trimmed, nugget: trimmed.substring(0, 100) };
  }

  if (trimmed.length > 10000) {
    console.warn('[AI] Text too long, truncating to 10000 chars');
    text = trimmed.substring(0, 10000);
  } else {
    text = trimmed;
  }

  // Rate limiting check
  if (!isAnalysisAllowed()) {
    throw new ApiError(
      'Too many analysis requests. Please wait a moment and try again.',
      'rate_limit'
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[AI] Supabase not configured, returning fallback analysis');
    return { ...FALLBACK_ANALYSIS, narrative: text, nugget: text.substring(0, 100) };
  }

  // Call edge function with retries
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[AI] Retry attempt ${attempt}/${MAX_RETRIES}`);
      await delay(RETRY_DELAY_MS * attempt); // Linear backoff
    }

    try {
      const { data, error } = await supabase.functions.invoke('analyze-dream', {
        body: { text },
      });

      if (error) {
        console.error('[AI] Edge function error:', error.message);
        lastError = new Error(error.message);

        // Don't retry on client errors (4xx)
        if (error.message?.includes('400') || error.message?.includes('401') || error.message?.includes('403')) {
          break;
        }
        continue;
      }

      if (!data) {
        console.error('[AI] Edge function returned no data');
        lastError = new Error('No response from analysis service');
        continue;
      }

      // Check if the response contains an error field
      const responseData = data as { analysis?: DreamAnalysis; error?: string; fallback?: DreamAnalysis; provider?: string };

      if (responseData.error) {
        console.warn('[AI] Analysis service returned error:', responseData.error);
        if (responseData.fallback) {
          return responseData.fallback;
        }
        lastError = new Error(responseData.error);
        continue;
      }

      if (responseData.analysis) {
        return responseData.analysis;
      }

      console.error('[AI] Unexpected response format:', data);
      lastError = new Error('Unexpected response format');
    } catch (err) {
      console.error('[AI] Analysis error:', err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  console.error('[AI] All retries exhausted. Last error:', lastError);
  return { ...FALLBACK_ANALYSIS, narrative: text, nugget: text.substring(0, 100) };
}

/**
 * Generate a dream image prompt from dream text.
 * Returns a prompt suitable for image generation APIs.
 *
 * @param dreamText — The dream text to derive a prompt from
 * @param style — Visual style: 'dreamlike' | 'realistic' | 'artistic' | 'minimal' | 'cinematic'
 * @returns An enhanced prompt string for image generation
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
