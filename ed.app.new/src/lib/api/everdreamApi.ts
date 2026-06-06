/**
 * EverDream Unified API Client
 *
 * Provides a single entry point for all Supabase Edge Function calls
 * with built-in error handling, retry logic, and user-friendly error messages.
 *
 * All functions return a consistent `ApiResult<T>` type:
 *   { success: boolean, data?: T, error?: string, retryable: boolean }
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Supabase anon/public key
 */

import { supabase } from '../supabase/client';

// ── Types ────────────────────────────────────────────────────

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retryable: boolean;
  provider?: string;
}

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

export interface TranscriptionResult {
  text: string;
  language?: string;
  source: 'hf-whisper' | 'web-speech' | 'fallback';
}

export interface ImageResult {
  imageUrl: string;
  source: string;
  prompt: string;
}

// ── Error Classification ──────────────────────────────────────

function classifyError(err: unknown): { message: string; retryable: boolean } {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('network') || lower.includes('offline') || lower.includes('fetch')) {
    return { message: 'Unable to connect. Please check your internet connection.', retryable: true };
  }
  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many')) {
    return { message: 'Too many requests. Please wait a moment and try again.', retryable: true };
  }
  if (lower.includes('unauthorized') || lower.includes('401') || lower.includes('403')) {
    return { message: 'Authentication failed. Please sign in again.', retryable: false };
  }
  if (lower.includes('503') || lower.includes('502') || lower.includes('unavailable') || lower.includes('loading')) {
    return { message: 'The service is temporarily unavailable. Please try again shortly.', retryable: true };
  }
  if (lower.includes('invalid') || lower.includes('400') || lower.includes('empty') || lower.includes('too short')) {
    return { message: 'The request was invalid. Please check your input.', retryable: false };
  }

  return { message: msg || 'Something unexpected happened. Please try again.', retryable: true };
}

// ── Retry Helper ─────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 2000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const { retryable } = classifyError(err);
      if (!retryable) break;
    }
  }

  throw lastError;
}

// ── API Functions ─────────────────────────────────────────────

/**
 * Analyze a dream using AI via the Supabase Edge Function.
 * The edge function handles multi-provider fallback automatically.
 *
 * @param text — The dream text to analyze (minimum 10 characters)
 * @returns ApiResult<DreamAnalysis>
 *
 * @example
 * ```ts
 * const result = await api.analyzeDream('I was flying over a vast ocean...');
 * if (result.success) {
 *   console.log(result.data.category); // 'adventure'
 *   console.log(result.data.themes);   // ['freedom', 'exploration', 'water']
 * } else {
 *   console.error(result.error);       // User-friendly error message
 *   if (result.retryable) showRetryButton();
 * }
 * ```
 */
export async function analyzeDream(text: string): Promise<ApiResult<DreamAnalysis>> {
  if (!text || text.trim().length < 10) {
    return {
      success: false,
      error: 'Dream text is too short. Please write at least 10 characters.',
      retryable: false,
    };
  }

  try {
    const data = await withRetry(async () => {
      const { data, error } = await supabase.functions.invoke('analyze-dream', {
        body: { text: text.trim().substring(0, 10000) },
      });

      if (error) throw new Error(error.message);
      if (!data) throw new Error('No response from analysis service');

      const response = data as {
        analysis?: DreamAnalysis;
        error?: string;
        fallback?: DreamAnalysis;
        provider?: string;
        model?: string;
      };

      if (response.error && response.fallback) {
        return { analysis: response.fallback, provider: 'fallback' };
      }
      if (response.error) throw new Error(response.error);
      if (response.analysis) {
        return { analysis: response.analysis, provider: response.provider || 'unknown' };
      }

      throw new Error('Unexpected response format');
    });

    return {
      success: true,
      data: data.analysis,
      provider: data.provider,
      retryable: false,
    };
  } catch (err) {
    const { message, retryable } = classifyError(err);
    return { success: false, error: message, retryable };
  }
}

/**
 * Generate an image from a text prompt via the Supabase Edge Function.
 * Uses Pollinations.ai (free, no API key needed).
 *
 * @param prompt — The text prompt for image generation
 * @param style — Visual style: 'dreamlike' | 'realistic' | 'artistic' | 'minimal' | 'cinematic'
 * @returns ApiResult<ImageResult>
 *
 * @example
 * ```ts
 * const result = await api.generateImage('A surreal landscape with floating islands', 'dreamlike');
 * if (result.success) {
 *   setImageUrl(result.data.imageUrl);
 * }
 * ```
 */
export async function generateImage(
  prompt: string,
  style: string = 'dreamlike'
): Promise<ApiResult<ImageResult>> {
  if (!prompt || prompt.trim().length === 0) {
    return {
      success: false,
      error: 'Please provide a description for the image.',
      retryable: false,
    };
  }

  try {
    const data = await withRetry(async () => {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: prompt.trim().substring(0, 2000), style, width: 1024, height: 1024 },
      });

      if (error) throw new Error(error.message);
      if (!data) throw new Error('No response from image generation service');

      const response = data as { imageUrl?: string; source?: string; prompt?: string; error?: string };

      if (response.error) throw new Error(response.error);
      if (!response.imageUrl) throw new Error('No image URL in response');

      return {
        imageUrl: response.imageUrl,
        source: response.source || 'pollinations',
        prompt: response.prompt || prompt,
      };
    });

    return {
      success: true,
      data,
      retryable: false,
    };
  } catch (err) {
    const { message, retryable } = classifyError(err);
    return { success: false, error: message, retryable };
  }
}

/**
 * Transcribe audio via the Supabase Edge Function (HF Whisper proxy).
 *
 * @param audioData — Blob, File, or ArrayBuffer of audio data
 * @param language — Optional language hint (e.g., 'en')
 * @returns ApiResult<TranscriptionResult>
 *
 * @example
 * ```ts
 * const result = await api.transcribeAudio(audioBlob, 'en');
 * if (result.success) {
 *   setDreamText(result.data.text);
 * }
 * ```
 */
export async function transcribeAudio(
  audioData: Blob | File | ArrayBuffer,
  language: string = 'en'
): Promise<ApiResult<TranscriptionResult>> {
  if (!audioData) {
    return {
      success: false,
      error: 'No audio data provided.',
      retryable: false,
    };
  }

  try {
    const blob = audioData instanceof ArrayBuffer
      ? new Blob([audioData], { type: 'audio/wav' })
      : audioData;

    if (blob.size === 0) {
      return {
        success: false,
        error: 'Audio file is empty.',
        retryable: false,
      };
    }

    if (blob.size > 25 * 1024 * 1024) {
      return {
        success: false,
        error: 'Audio file too large. Maximum 25 MB.',
        retryable: false,
      };
    }

    const data = await withRetry(async () => {
      const arrayBuffer = await (blob as Blob).arrayBuffer();

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: arrayBuffer,
        headers: {
          'Content-Type': (blob as Blob).type || 'audio/wav',
          'X-Language': language,
        },
      });

      if (error) throw new Error(error.message);
      if (!data) throw new Error('No response from transcription service');

      const response = data as { text?: string; language?: string; error?: string };

      if (response.error) throw new Error(response.error);

      return {
        text: (response.text || '').trim(),
        language: response.language || language,
        source: 'hf-whisper' as const,
      };
    });

    return {
      success: true,
      data,
      retryable: false,
    };
  } catch (err) {
    const { message, retryable } = classifyError(err);
    return { success: false, error: message, retryable };
  }
}

/**
 * Check the health of all edge functions.
 * Useful for monitoring and debugging.
 *
 * @returns ApiResult with health status of each function
 */
export async function checkHealth(): Promise<
  ApiResult<{
    status: string;
    functions: { name: string; configured: boolean; missingSecrets: string[] }[];
    timestamp: string;
  }>
> {
  try {
    const { data, error } = await supabase.functions.invoke('health-check');

    if (error) throw new Error(error.message);

    return {
      success: true,
      data: data as any,
      retryable: true,
    };
  } catch (err) {
    const { message, retryable } = classifyError(err);
    return { success: false, error: message, retryable };
  }
}

// ── Default Export ────────────────────────────────────────────

const api = {
  analyzeDream,
  generateImage,
  transcribeAudio,
  checkHealth,
};

export default api;
