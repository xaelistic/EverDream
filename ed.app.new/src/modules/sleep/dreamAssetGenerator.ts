/**
 * Dream Asset Generator — Multi-Provider Image Generation Process
 *
 * Generates dream images using a multi-provider fallback process:
 * 
 * STAGE 1: Cloud APIs (Try in order)
 *   1a. Hugging Face Inference API - FREE, reliable, high quality
 *   1b. Puter.com AI API - FREE, easy to use
 *   1c. Supabase Edge Function (proxies Pollinations.ai) - FREE, CORS-safe
 *   1d. Direct Pollinations.ai - FREE, no API key needed
 * 
 * STAGE 2: Stock Photos & Fallbacks
 *   2a. Unsplash Source API - Free stock photos matching dream theme
 *   2b. Dynamic SVG Generator - Always works, dream-themed placeholder
 * 
 * FALLBACK:
 *   3. Simple SVG placeholder with text - Guaranteed to work
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Your Supabase anon/public key
 *   VITE_HUGGINGFACE_TOKEN  — Your Hugging Face API token (free from hf.co/settings/tokens)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DreamAsset } from './types';
export type { DreamAsset };

// ── Constants ────────────────────────────────────────────────

const POLLINATIONS_API_URL = 'https://image.pollinations.ai/prompt';
const PUTER_AI_API_URL = 'https://api.puter.com/ai/txt2img';
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

// Unsplash source keywords for dream-related images
const UNSPLASH_DREAM_KEYWORDS = [
  'dream', 'surreal', 'fantasy', 'ethereal', 'cosmic', 'stars', 'nebula',
  'mystical', 'magical', 'abstract', 'artistic', 'painting', 'digital art'
];

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

// ── Hugging Face Inference API ───────────────────────────────

/**
 * Generate image using Hugging Face Inference API.
 * FREE tier available with token from hf.co/settings/tokens
 * Uses Stable Diffusion XL for high-quality results.
 */
async function generateWithHuggingFace(prompt: string, style: string = 'dreamlike'): Promise<DreamAsset> {
  console.log('[AssetGen] Generating via Hugging Face Inference API...');
  
  const token = import.meta.env.VITE_HUGGINGFACE_TOKEN;
  if (!token) {
    throw new Error('Hugging Face token not configured. Set VITE_HUGGINGFACE_TOKEN env var.');
  }

  const enhancedPrompt = buildDreamPrompt(prompt);

  console.log('[AssetGen] Calling Hugging Face API...');
  const response = await fetch(HUGGINGFACE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      inputs: enhancedPrompt,
      parameters: {
        negative_prompt: 'blurry, low quality, distorted, ugly, watermark, text',
        num_inference_steps: 30,
        guidance_scale: 7.5,
        width: 1024,
        height: 1024,
      },
    }),
  });

  console.log('[AssetGen] Hugging Face response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AssetGen] Hugging Face error:', errorText);
    
    // Check if model is loading
    if (response.status === 503) {
      console.log('[AssetGen] Model is loading, waiting...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      throw new Error('Hugging Face model is loading, please try again');
    }
    
    throw new Error(`Hugging Face API failed: ${response.status} - ${errorText}`);
  }

  // Hugging Face returns binary image data
  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);

  // Validate the image URL actually loads
  try {
    await validateImageUrl(imageUrl, 30000);
    console.log('[AssetGen] Hugging Face image validated successfully');
  } catch (validationError) {
    console.error('[AssetGen] Hugging Face image validation failed:', validationError);
    throw new Error('Hugging Face generated invalid image');
  }

  return {
    id: makeId(),
    prompt: enhancedPrompt,
    url: imageUrl,
    source: 'huggingface',
    style: style || 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'huggingface.co',
      model: 'stabilityai/stable-diffusion-xl-base-1.0',
      note: 'Free tier via Hugging Face Inference API',
    },
  };
}

// ── Puter.com AI API ─────────────────────────────────────────

/**
 * Generate image using Puter.com AI API — FREE, simple to use.
 * No API key required for basic usage.
 * See: https://developer.puter.com/
 */
async function generateWithPuter(prompt: string, style: string = 'dreamlike'): Promise<DreamAsset> {
  console.log('[AssetGen] Generating via Puter.com AI...');
  
  const enhancedPrompt = buildDreamPrompt(prompt);

  console.log('[AssetGen] Calling Puter AI API...');
  const response = await fetch(PUTER_AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      width: 1024,
      height: 1024,
      steps: 20,
      guidance_scale: 7.5,
      negative_prompt: 'blurry, low quality, distorted, ugly, watermark',
    }),
  });

  console.log('[AssetGen] Puter AI response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AssetGen] Puter AI error:', errorText);
    throw new Error(`Puter AI API failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('[AssetGen] Puter AI response received');

  // Puter returns either a URL or base64 data
  let imageUrl: string;
  if (result.url) {
    imageUrl = result.url;
  } else if (result.image || result.data) {
    // If base64, convert to blob URL
    const base64Data = result.image || result.data;
    const blob = await fetch(`data:image/png;base64,${base64Data}`).then(r => r.blob());
    imageUrl = URL.createObjectURL(blob);
  } else {
    console.error('[AssetGen] Puter AI returned no image data:', result);
    throw new Error('Puter AI returned no image data');
  }

  // Validate the image URL actually loads
  try {
    await validateImageUrl(imageUrl, 30000);
    console.log('[AssetGen] Puter AI image validated successfully');
  } catch (validationError) {
    console.error('[AssetGen] Puter AI image validation failed:', validationError);
    throw new Error('Puter AI generated invalid image URL');
  }

  return {
    id: makeId(),
    prompt: enhancedPrompt,
    url: imageUrl,
    source: 'puter',
    style: style || 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'puter.com',
      model: 'stable-diffusion',
      note: 'Free generation via Puter AI API',
    },
  };
}

// ── Image Generation via Edge Function ───────────────────────

/**
 * Generate image via Supabase Edge Function.
 * Falls back to direct Pollinations if Supabase is not configured.
 */
async function generateWithEdgeFunction(prompt: string, style: string = 'dreamlike'): Promise<DreamAsset> {
  console.log('[AssetGen] Generating image via Edge Function with prompt:', prompt.substring(0, 50));
  const supabase = getSupabase();

  if (supabase) {
    try {
      console.log('[AssetGen] Invoking Supabase generate-image function...');
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, style, width: 1024, height: 1024, format: 'json' },
      });

      if (error) {
        console.error('[AssetGen] Edge function error:', error.message);
        throw new Error(error.message);
      }

      console.log('[AssetGen] Edge function response received');
      const result = data as { imageUrl?: string; source?: string; prompt?: string; error?: string };

      if (result.error) {
        console.error('[AssetGen] Image generation error from service:', result.error);
        throw new Error(result.error);
      }

      console.log('[AssetGen] Image URL received:', result.imageUrl?.substring(0, 80));
      
      if (result.imageUrl) {
        try {
          await validateImageUrl(result.imageUrl, 30000);
          console.log('[AssetGen] Edge function image validated successfully');
        } catch (validationError) {
          console.error('[AssetGen] Edge function image validation failed:', validationError);
          throw new Error('Edge function generated invalid image URL');
        }
        
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
      } else {
        console.warn('[AssetGen] No imageUrl in response, falling back');
      }
    } catch (err) {
      console.warn('[AssetGen] Edge function failed, falling back to direct:', err);
    }
  }

  // Fallback: direct Pollinations
  return generateWithPollinations(prompt, style);
}

// ── Pollinations.ai ──────────────────────────────────────────

/**
 * Generate image using Pollinations.ai — FREE tier with optimized parameters.
 * Uses direct URL format which works reliably without CORS issues.
 * NOTE: nologo=true requires payment, so we use nologo=false for free tier.
 */
async function generateWithPollinations(prompt: string, style: string = 'dreamlike'): Promise<DreamAsset> {
  console.log('[AssetGen] Generating via Pollinations...');
  const enhancedPrompt = buildDreamPrompt(prompt);
  const encodedPrompt = encodeURIComponent(enhancedPrompt);
  const imageUrl = `${POLLINATIONS_API_URL}/${encodedPrompt}?width=1024&height=1024&seed=${Date.now() % 1000000}&nologo=false`;

  console.log('[AssetGen] Pollinations URL:', imageUrl.substring(0, 100));
  
  try {
    await validateImageUrl(imageUrl, 30000);
    console.log('[AssetGen] Pollinations image validated successfully');
  } catch (validationError) {
    console.error('[AssetGen] Pollinations image validation failed:', validationError);
    throw new Error('Pollinations generated invalid image URL');
  }

  return {
    id: makeId(),
    prompt: enhancedPrompt,
    url: imageUrl,
    source: 'pollinations',
    style: style || 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'pollinations.ai',
      model: 'flux',
      note: 'Free tier - 1024x1024 resolution (includes watermark)',
    },
  };
}

// ── Unsplash Source API ──────────────────────────────────────

/**
 * Generate image URL using Unsplash Source API.
 * Returns a random stock photo matching dream-related keywords.
 * This is a reliable fallback that always returns valid images.
 */
async function generateWithUnsplash(prompt: string, style: string = 'dreamlike'): Promise<DreamAsset> {
  console.log('[AssetGen] Generating via Unsplash Source...');
  
  // Extract keywords from prompt or use defaults
  const promptLower = prompt.toLowerCase();
  const matchedKeywords = UNSPLASH_DREAM_KEYWORDS.filter(keyword => 
    promptLower.includes(keyword) || promptLower.includes(keyword.substring(0, 4))
  );
  
  // Use matched keywords or pick random defaults
  const keywords = matchedKeywords.length > 0 
    ? matchedKeywords.slice(0, 3).join(',')
    : UNSPLASH_DREAM_KEYWORDS[Math.floor(Math.random() * 3)] + ',abstract,art';
  
  // Unsplash Source URL (returns redirect to actual image)
  const unsplashUrl = `https://source.unsplash.com/1024x1024/?${encodeURIComponent(keywords)}&sig=${Date.now()}`;
  
  console.log('[AssetGen] Unsplash URL:', unsplashUrl);
  
  // Validate the image URL actually loads
  try {
    await validateImageUrl(unsplashUrl, 30000);
    console.log('[AssetGen] Unsplash image validated successfully');
  } catch (validationError) {
    console.error('[AssetGen] Unsplash image validation failed:', validationError);
    throw new Error('Unsplash generated invalid image URL');
  }

  return {
    id: makeId(),
    prompt: prompt,
    url: unsplashUrl,
    source: 'fallback',
    style: style || 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'unsplash.com',
      note: 'Stock photo fallback using Unsplash Source API',
    },
  };
}

// ── Dynamic SVG Generator ────────────────────────────────────

/**
 * Generate a dynamic SVG placeholder with dream-themed content.
 * Creates a unique, visually appealing SVG based on the dream text.
 * This ALWAYS works and provides a meaningful visual fallback.
 */
function generateDynamicSVG(prompt: string, style: string = 'dreamlike'): DreamAsset {
  console.log('[AssetGen] Generating dynamic SVG placeholder...');
  
  const trimmedPrompt = prompt.trim().substring(0, 100);
  const shortPrompt = trimmedPrompt.length > 60 ? trimmedPrompt.substring(0, 57) + '...' : trimmedPrompt;
  const displayPrompt = shortPrompt || 'Dream Visualization';
  
  // Generate consistent colors based on prompt length
  const hue1 = (trimmedPrompt.length * 13) % 360;
  const hue2 = (hue1 + 60) % 360;
  const hue3 = (hue1 + 180) % 360;
  
  // Create gradient IDs based on timestamp for uniqueness
  const gradId = `grad-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  // Generate decorative elements based on prompt
  const circleCount = Math.min(Math.max(trimmedPrompt.length / 10, 3), 8);
  const circles = Array.from({ length: circleCount }, (_, i) => {
    const cx = 20 + (i * 15) % 80;
    const cy = 20 + (i * 23) % 60;
    const r = 5 + (i * 7) % 15;
    const opacity = 0.1 + (i % 5) * 0.1;
    const fill = `hsl(${(hue1 + i * 30) % 360}, 70%, 60%)`;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${opacity}" />`;
  }).join('\n    ');

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="${gradId}-main" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${hue1}, 70%, 20%);stop-opacity:1" />
      <stop offset="50%" style="stop-color:hsl(${hue2}, 60%, 30%);stop-opacity:1" />
      <stop offset="100%" style="stop-color:hsl(${hue3}, 80%, 25%);stop-opacity:1" />
    </linearGradient>
    <radialGradient id="${gradId}-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:hsl(${hue1}, 90%, 70%);stop-opacity:0.4" />
      <stop offset="100%" style="stop-color:hsl(${hue2}, 80%, 50%);stop-opacity:0" />
    </radialGradient>
    <filter id="${gradId}-blur">
      <feGaussianBlur stdDeviation="20" />
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#${gradId}-main)" />
  
  <!-- Decorative circles -->
  ${circles}
  
  <!-- Glow effects -->
  <circle cx="512" cy="512" r="300" fill="url(#${gradId}-glow)" filter="url(#${gradId}-blur)" />
  <circle cx="300" cy="400" r="150" fill="url(#${gradId}-glow)" filter="url(#${gradId}-blur)" opacity="0.6" />
  <circle cx="700" cy="600" r="200" fill="url(#${gradId}-glow)" filter="url(#${gradId}-blur)" opacity="0.5" />
  
  <!-- Stars -->
  ${Array.from({ length: 50 }, (_, i) => {
    const x = (i * 73) % 1024;
    const y = (i * 91) % 1024;
    const r = (i % 3) + 1;
    const opacity = 0.3 + (i % 5) * 0.1;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${opacity}" />`;
  }).join('\n  ')}
  
  <!-- Text container with backdrop -->
  <rect x="100" y="450" width="824" height="200" rx="20" fill="rgba(0,0,0,0.5)" />
  
  <!-- Main text -->
  <text x="512" y="540" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="white" opacity="0.9">
    Dream Visualization
  </text>
  <text x="512" y="590" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#e0e0e0">
    ${displayPrompt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
  </text>
  
  <!-- Status indicator -->
  <text x="512" y="640" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#a0a0a0" font-style="italic">
    ✨ Dream generation in progress • Placeholder image ✨
  </text>
  
  <!-- Border accent -->
  <rect x="50" y="50" width="924" height="924" rx="40" fill="none" stroke="hsl(${hue1}, 70%, 60%)" stroke-width="4" opacity="0.3" />
</svg>`;

  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
  const svgUrl = URL.createObjectURL(svgBlob);

  return {
    id: makeId(),
    prompt: prompt,
    url: svgUrl,
    source: 'fallback',
    style: style || 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'dynamic-svg-generator',
      note: 'Dynamic SVG placeholder with dream-themed visuals',
      promptHash: trimmedPrompt.length,
    },
  };
}

// ── Simple SVG Fallback ──────────────────────────────────────

/**
 * Generate a simple SVG placeholder as last resort.
 * Minimal, guaranteed to work.
 */
function generateSimpleSVGPlaceholder(prompt: string): DreamAsset {
  console.log('[AssetGen] Generating simple SVG placeholder (last resort)...');
  
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#1a1a2e" />
  <text x="512" y="480" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="#e94560">
    Dream Image
  </text>
  <text x="512" y="540" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#a0a0a0">
    Generation in progress...
  </text>
  <text x="512" y="600" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#666666">
    Please try again later
  </text>
</svg>`;

  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
  const svgUrl = URL.createObjectURL(svgBlob);

  return {
    id: makeId(),
    prompt: prompt,
    url: svgUrl,
    source: 'fallback',
    style: 'placeholder',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'simple-svg-placeholder',
      note: 'Minimal SVG placeholder - all other providers failed',
    },
  };
}

// ── Main Generation Function ─────────────────────────────────

/**
 * Main dream image generation function with multi-provider fallback.
 * Tries providers in order until one succeeds.
 * 
 * Provider order:
 * 1. Hugging Face (if token configured)
 * 2. Puter.com AI
 * 3. Supabase Edge Function → Pollinations
 * 4. Unsplash Source (stock photos)
 * 5. Dynamic SVG Generator (custom placeholder)
 * 6. Simple SVG (last resort)
 */
export async function generateDreamImage(
  dreamText: string,
  style: string = 'dreamlike'
): Promise<DreamAsset> {
  console.log('[AssetGen] Starting dream image generation for:', dreamText.substring(0, 50));
  
  const providers = [
    { name: 'Hugging Face', fn: generateWithHuggingFace, enabled: !!import.meta.env.VITE_HUGGINGFACE_TOKEN },
    { name: 'Puter.com AI', fn: generateWithPuter, enabled: true },
    { name: 'Supabase Edge/Pollinations', fn: generateWithEdgeFunction, enabled: true },
    { name: 'Unsplash Source', fn: generateWithUnsplash, enabled: true },
  ];

  for (const provider of providers) {
    if (!provider.enabled) {
      console.log(`[AssetGen] Skipping ${provider.name} (not configured)`);
      continue;
    }

    try {
      console.log(`[AssetGen] Trying ${provider.name}...`);
      const result = await provider.fn(dreamText, style);
      console.log(`[AssetGen] SUCCESS: ${provider.name} generated image`);
      return result;
    } catch (error) {
      console.warn(`[AssetGen] ${provider.name} failed:`, error instanceof Error ? error.message : error);
      // Continue to next provider
    }
  }

  // If all providers fail, try dynamic SVG
  console.log('[AssetGen] All cloud providers failed, generating dynamic SVG...');
  try {
    const dynamicSvg = generateDynamicSVG(dreamText, style);
    console.log('[AssetGen] Dynamic SVG generated successfully');
    return dynamicSvg;
  } catch (error) {
    console.error('[AssetGen] Dynamic SVG generation failed:', error);
  }

  // Last resort: simple placeholder
  console.log('[AssetGen] Using simple SVG placeholder as last resort');
  return generateSimpleSVGPlaceholder(dreamText);
}

// ── Exports ──────────────────────────────────────────────────

export {
  generateWithHuggingFace,
  generateWithPuter,
  generateWithEdgeFunction,
  generateWithPollinations,
  generateWithUnsplash,
  generateDynamicSVG,
  generateSimpleSVGPlaceholder,
  buildDreamPrompt,
  validateImageUrl,
};
