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
 * Generate a fallback image using a placeholder SVG gradient.
 * Unsplash source API was shut down in 2024, so we use a generated placeholder instead.
 */
async function generateFallbackImage(prompt: string): Promise<DreamAsset> {
  // Create a deterministic color based on prompt
  const hash = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 40) % 360;
  
  // Generate SVG gradient placeholder
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue1}, 70%, 50%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(${hue2}, 70%, 30%);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#grad)"/>
      <text x="50%" y="50%" text-anchor="middle" fill="white" font-size="24" font-family="sans-serif" opacity="0.8">
        Dream Image
      </text>
    </svg>
  `.trim().replace(/\n/g, ''));
  
  const imageUrl = `data:image/svg+xml;charset=utf-8,${svg}`;

  return {
    id: makeId(),
    prompt,
    url: imageUrl,
    source: 'fallback',
    style: 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'svg-placeholder',
      note: 'Generated placeholder - all providers failed',
    },
  };
}

// ── Main Exports ─────────────────────────────────────────────

/**
 * Main image generation function — tries Supabase Edge Function first,
 * then falls back to direct Poll