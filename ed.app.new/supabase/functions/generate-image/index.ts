/**
 * Supabase Edge Function: generate-image v2
 *
 * Proxies Pollinations.ai for free dream image generation.
 * Returns the actual image bytes to avoid CORS issues in the browser.
 * Falls back to returning the URL if image fetching fails.
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

const POLLINATIONS_BASE_URL = 'https://image.pollinations.ai/prompt';

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

// ── Image Generation ─────────────────────────────────────────

async function generateWithPollinations(
  prompt: string,
  width: number,
  height: number,
  format: 'binary' | 'json',
): Promise<Response> {
  const enhancedPrompt = buildEnhancedPrompt(prompt, 'dreamlike');
  const encodedPrompt = encodeURIComponent(enhancedPrompt);
  const seed = Date.now() % 1_000_000;
  const imageUrl = `${POLLINATIONS_BASE_URL}/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

  if (format === 'json') {
    return jsonResponse({
      imageUrl,
      source: 'pollinations',
      prompt: enhancedPrompt,
    });
  }

  // Fetch the actual image bytes to proxy them (avoids CORS)
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Pollinations returned ${imageResponse.status}`);
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

    // Generate image via Pollinations
    try {
      console.log('[generate-image] Generating via Pollinations...');
      const result = await generateWithPollinations(prompt, width, height, format);
      console.log('[generate-image] Success');
      return result;
    } catch (err) {
      console.warn('[generate-image] Pollinations failed:', err);
    }

    // All providers failed
    return errorResponse(
      'Image generation is currently unavailable. Please try again later.',
      502,
    );
  } catch (err) {
    console.error('[generate-image] Unexpected error:', err);
    return errorResponse('An unexpected error occurred during image generation.', 500);
  }
});
