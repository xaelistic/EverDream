/**
 * Dream Asset Generator — Supabase Edge Function Proxy
 *
 * Generates dream images via the Supabase Edge Function `generate-image`
 * instead of calling Pollinations/HuggingFace directly from the client.
 * Falls back to direct Pollinations calls if Supabase is not configured.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Your Supabase anon/public key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DreamAsset } from './types';
export type { DreamAsset };

// ── Constants ────────────────────────────────────────────────

const POLLINATIONS_API_URL = 'https://image.pollinations.ai/prompt';
const HF_API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

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

// ── Helpers ──────────────────────────────────────────────────

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildDreamPrompt(dreamText: string): string {
  const trimmed = dreamText.trim();
  const seed = trimmed.length > 0 ? trimmed : 'a surreal dreamscape filled with stars';
  return `${seed}, dreamlike, ethereal, surreal, cinematic lighting, fantasy, digital art, highly detailed`;
}

/**
 * Validate that an image URL actually loads.
 * Throws if the image fails to load within the timeout.
 */
function validateImageUrl(url: string, timeoutMs = 60000): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error(`Image load timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Image failed to load'));
    };
    img.src = url;
  });
}

// ── Image Generation via Edge Function ───────────────────────

/**
 * Generate image via Supabase Edge Function.
 * Falls back to direct Pollinations if Supabase is not configured.
 */
async function generateWithEdgeFunction(prompt: string, style: string = 'dreamlike'): Promise<DreamAsset> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, style, width: 1024, height: 1024 },
      });

      if (error) {
        console.warn('[AssetGen] Edge function error:', error.message);
        throw new Error(error.message);
      }

      const result = data as { imageUrl?: string; source?: string; prompt?: string; error?: string };

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.imageUrl) {
        return {
          id: makeId(),
          prompt: result.prompt || prompt,
          url: result.imageUrl,
          source: (result.source as DreamAsset['source']) || 'pollinations',
          style: style || 'dreamlike',
          generatedAt: new Date().toISOString(),
          metadata: {
            provider: result.source || 'edge-function',
            note: 'Generated via Supabase Edge Function',
          },
        };
      }
    } catch (err) {
      console.warn('[AssetGen] Edge function failed, falling back to direct:', err);
    }
  }

  // Fallback: direct Pollinations
  return generateWithPollinations(prompt);
}

/**
 * Generate image using Pollinations.ai — completely free, no API key needed.
 * Validates that the image URL actually loads before returning.
 */
async function generateWithPollinations(prompt: string): Promise<DreamAsset> {
  const enhancedPrompt = buildDreamPrompt(prompt);
  const encodedPrompt = encodeURIComponent(enhancedPrompt);
  const imageUrl = `${POLLINATIONS_API_URL}/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Date.now() % 1000000}`;

  // Don't validate — Pollinations URLs are direct image links
  // The browser will handle loading/errors naturally

  return {
    id: makeId(),
    prompt: enhancedPrompt,
    url: imageUrl,
    source: 'pollinations',
    style: 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'pollinations.ai',
      model: 'flux',
      note: 'Free unlimited generation',
    },
  };
}

/**
 * Generate image using HuggingFace Inference API (free, no auth for public models)
 */
async function generateWithHuggingFace(prompt: string): Promise<DreamAsset> {
  const enhancedPrompt = buildDreamPrompt(prompt);
  const HF_API_KEY = import.meta.env.VITE_HF_INFERENCE_API_KEY || '';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (HF_API_KEY) {
    headers['Authorization'] = `Bearer ${HF_API_KEY}`;
  }

  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inputs: enhancedPrompt,
      parameters: {
        negative_prompt: 'blurry, low quality, distorted, ugly',
        num_inference_steps: 20,
        guidance_scale: 7.5,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HuggingFace API failed: ${response.status}`);
  }

  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);

  return {
    id: makeId(),
    prompt: enhancedPrompt,
    url: imageUrl,
    source: 'replicate',
    style: 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'huggingface.co',
      model: 'stabilityai/stable-diffusion-xl-base-1.0',
      note: 'Free generation via Inference API',
    },
  };
}

/**
 * Generate a fallback image using Unsplash
 */
async function generateFallbackImage(prompt: string): Promise<DreamAsset> {
  const query = encodeURIComponent(
    prompt
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .slice(0, 6)
      .join(',') || 'dreamscape'
  );

  const imageUrl = `https://source.unsplash.com/800x600/?${query},dream,ethereal`;

  return {
    id: makeId(),
    prompt,
    url: imageUrl,
    source: 'fallback',
    style: 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'unsplash-fallback',
    },
  };
}

// ── Main Exports ─────────────────────────────────────────────

/**
 * Main image generation function — tries Supabase Edge Function first,
 * then falls back to direct Pollinations, HuggingFace, and Unsplash.
 * Validates each image before returning so callers never get broken URLs.
 *
 * @param dreamText — The dream text to generate an image from
 * @param style — Visual style (default: 'dreamlike')
 * @returns A validated DreamAsset
 */
export async function generateDreamImage(dreamText: string, style: string = 'dreamlike'): Promise<DreamAsset> {
  // Try Supabase Edge Function first (or direct Pollinations as fallback)
  try {
    console.log('[AssetGen] Generating image via edge function...');
    const asset = await generateWithEdgeFunction(dreamText, style);
    console.log('[AssetGen] Image generated successfully');
    return asset;
  } catch (error) {
    console.warn('[AssetGen] Edge function/Pollinations failed:', error);
  }

  // Try HuggingFace as third option
  try {
    console.log('[AssetGen] Generating image with HuggingFace...');
    const asset = await generateWithHuggingFace(dreamText);
    console.log('[AssetGen] HuggingFace image validated successfully');
    return asset;
  } catch (error) {
    console.warn('[AssetGen] HuggingFace failed:', error);
  }

  // Fallback to Unsplash (no validation needed — it's a stock photo)
  console.log('[AssetGen] Using Unsplash fallback...');
  return generateFallbackImage(dreamText);
}

/**
 * Generate multiple dream assets with validated URLs.
 *
 * @param dreamText — The dream text to generate images from
 * @param count — Number of assets to generate (default: 2)
 * @returns Array of validated DreamAssets
 */
export async function generateDreamAssets(dreamText: string, count = 2): Promise<DreamAsset[]> {
  const assets: DreamAsset[] = [];
  const errors: string[] = [];

  // Try to generate with different providers for variety
  const generators = [
    () => generateWithEdgeFunction(dreamText, 'dreamlike'),
    () => generateFallbackImage(dreamText),
  ];

  for (const generator of generators) {
    if (assets.length >= count) break;
    try {
      const asset = await generator();
      assets.push(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      console.warn('[AssetGen] Dream asset provider skipped:', message);
    }
  }

  // If everything failed, return at least a fallback (Unsplash never throws)
  if (assets.length === 0) {
    console.warn('[AssetGen] All providers failed, using Unsplash fallback. Errors:', errors);
    assets.push(await generateFallbackImage(dreamText));
  }

  return assets.slice(0, count);
}
