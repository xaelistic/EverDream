/**
 * Supabase Edge Function: generate-image v3
 *
 * Multi-provider image generation with automatic fallback.
 * Returns the actual image bytes to avoid CORS issues in the browser.
 *
 * Provider Priority:
 * 1. Hugging Face Inference API (FREE - Stable Diffusion XL)
 * 2. Fal AI (cheap ~$0.001-0.01/image)
 * 3. Local SD (if configured)
 *
 * Environment variables (set via `supabase secrets set`):
 *   HF_INFERENCE_API_KEY — Hugging Face token (free from hf.co/settings/tokens)
 *   FAL_AI_KEY — Fal AI API key (from fal.ai/dashboard/keys)
 *
 * Request body:
 *   { prompt: string, style?: string, width?: number, height?: number }
 *
 * Response (success):
 *   Binary image data with appropriate Content-Type header
 *   OR JSON: { imageUrl: string, source: string, prompt: string }
 *
 * Error responses:
 *   400 — Missing or invalid prompt
 *   502 — All image providers failed
 *   500 — Unexpected server error
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// ── Types ────────────────────────────────────────────────────

interface GenerateImageRequest {
  prompt?: string;
  style?: string;
  width?: number;
  height?: number;
  format?: 'binary' | 'json';
}

// ── Constants ────────────────────────────────────────────────

const HF_API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';
const FAL_API_URL = 'https://fal.ai/api/fal-ai/fast-sdxl';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STYLE_MAP: Record<string, string> = {
  dreamlike: 'surreal, ethereal, soft lighting, dreamlike atmosphere',
  realistic: 'photorealistic, detailed, natural lighting',
  artistic: 'oil painting style, impressionistic, vibrant colors',
  minimal: 'minimalist, clean lines, simple composition',
  cinematic: 'cinematic lighting, dramatic, wide angle, film grain',
};

const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;

// ── Helpers ──────────────────────────────────────────────────

function buildEnhancedPrompt(prompt: string, style: string): string {
  const styleDesc = STYLE_MAP[style] || STYLE_MAP.dreamlike;
  return `${prompt.trim()}, ${styleDesc}, 4k, high quality`;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

// ── Provider: Hugging Face (FREE) ────────────────────────────

async function generateWithHuggingFace(
  prompt: string,
  width: number,
  height: number,
): Promise<Response> {
  const apiKey = Deno.env.get('HF_INFERENCE_API_KEY');
  if (!apiKey) throw new Error('HF_INFERENCE_API_KEY not set');

  const enhancedPrompt = buildEnhancedPrompt(prompt, 'dreamlike');

  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: enhancedPrompt,
      parameters: {
        negative_prompt: 'blurry, low quality, distorted, ugly, watermark, text',
        num_inference_steps: 30,
        guidance_scale: 7.5,
        width,
        height,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    // Model loading - wait and retry
    if (response.status === 503) {
      throw new Error('Hugging Face model is loading, please try again');
    }
    
    throw new Error(`Hugging Face failed: ${response.status} - ${errorText}`);
  }

  const imageBlob = await response.blob();
  const contentType = imageBlob.type || 'image/jpeg';

  return new Response(imageBlob, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      ...CORS_HEADERS,
    },
  });
}

// ── Provider: Fal AI (Cheap) ─────────────────────────────────

async function generateWithFalAI(
  prompt: string,
  width: number,
  height: number,
): Promise<Response> {
  const apiKey = Deno.env.get('FAL_AI_KEY');
  if (!apiKey) throw new Error('FAL_AI_KEY not set');

  const enhancedPrompt = buildEnhancedPrompt(prompt, 'dreamlike');

  const response = await fetch(FAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      image_size: { width, height },
      num_inference_steps: 25,
      guidance_scale: 7.5,
      negative_prompt: 'blurry, low quality, distorted, ugly, watermark',
    }),
  });

  if (!response.ok) {
    throw new Error(`Fal AI returned ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = data.images?.[0]?.url;
  
  if (!imageUrl) {
    throw new Error('Fal AI returned no image URL');
  }

  // Fetch the actual image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch Fal AI image: ${imageResponse.status}`);
  }

  const imageBlob = await imageResponse.blob();
  const contentType = imageBlob.type || 'image/jpeg';

  return new Response(imageBlob, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      ...CORS_HEADERS,
    },
  });
}

// ── Handler ──────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    // Parse request body
    let body: GenerateImageRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const {
      prompt,
      style = 'dreamlike',
      width = DEFAULT_WIDTH,
      height = DEFAULT_HEIGHT,
      format = 'json',
    } = body;

    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return errorResponse('Missing or invalid "prompt" field. Must be a non-empty string.', 400);
    }

    if (prompt.length > 2000) {
      return errorResponse('Prompt too long. Maximum 2000 characters.', 400);
    }

    // Try providers in order: free → cheap
    const errors: string[] = [];

    // Provider 1: Hugging Face (FREE)
    try {
      console.log('[generate-image] Trying Hugging Face...');
      const result = await generateWithHuggingFace(prompt, width, height);
      console.log('[generate-image] Hugging Face succeeded');
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[generate-image] Hugging Face failed:', msg);
      errors.push(`huggingface: ${msg}`);
    }

    // Provider 2: Fal AI (cheap)
    try {
      console.log('[generate-image] Trying Fal AI...');
      const result = await generateWithFalAI(prompt, width, height);
      console.log('[generate-image] Fal AI succeeded');
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[generate-image] Fal AI failed:', msg);
      errors.push(`fal-ai: ${msg}`);
    }

    // All providers failed
    console.error('[generate-image] All providers failed:', errors);
    return errorResponse(
      'Image generation is currently unavailable. Please try again later.',
      502,
    );
  } catch (err) {
    console.error('[generate-image] Unexpected error:', err);
    return errorResponse('An unexpected error occurred during image generation.', 500);
  }
});
