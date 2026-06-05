/**
 * Dream Asset Generator — 2-Stage Image Generation Process
 *
 * Generates dream images using a 2-stage fallback process:
 * 
 * STAGE 1: Cloud APIs (Try in order)
 *   1a. Puter.com AI API - FREE, easy to use
 *   1b. Supabase Edge Function (proxies Pollinations.ai) - FREE, CORS-safe
 *   1c. Direct Pollinations.ai - FREE, no API key needed
 * 
 * STAGE 2: Local Generation (Requires running on your computer)
 *   2a. AUTOMATIC1111 Stable Diffusion WebUI - Free, full control
 *   2b. ComfyUI - Free, workflow-based
 * 
 * FALLBACK:
 *   3. SVG placeholder - Always works
 *
 * This allows you to:
 * - Use free cloud APIs first (no setup required)
 * - Run local Stable Diffusion on your computer for unlimited generations
 * - Expose local API to the app when cloud services fail
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Your Supabase anon/public key
 *   VITE_LOCAL_GEN_URL      — Local generation endpoint (e.g., http://localhost:7860 for A1111)
 *   VITE_ENABLE_LOCAL_GEN   — Set to "true" to enable local generation fallback
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DreamAsset } from './types';
export type { DreamAsset };

// ── Constants ────────────────────────────────────────────────

const POLLINATIONS_API_URL = 'https://image.pollinations.ai/prompt';
const PUTER_AI_API_URL = 'https://api.puter.com/ai/txt2img';

// Local generation endpoints (user-configurable)
const DEFAULT_A1111_URL = 'http://localhost:7860';
const DEFAULT_COMFYUI_URL = 'http://localhost:8188';

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
  console.log('[AssetGen] Generating image via Edge Function with prompt:', prompt.substring(0, 50));
  const supabase = getSupabase();

  if (supabase) {
    try {
      console.log('[AssetGen] Invoking Supabase generate-image function...');
      // Request JSON format to get URL back instead of binary
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
  return generateWithPollinations(prompt);
}

/**
 * Generate image using Pollinations.ai — FREE tier with optimized parameters.
 * Uses 512x512 resolution which works on free tier (no nologo parameter).
 */
async function generateWithPollinations(prompt: string): Promise<DreamAsset> {
  console.log('[AssetGen] Generating via Pollinations...');
  const enhancedPrompt = buildDreamPrompt(prompt);
  const encodedPrompt = encodeURIComponent(enhancedPrompt);
  // Use 512x512 without nologo for free tier compatibility
  const imageUrl = `${POLLINATIONS_API_URL}/${encodedPrompt}?width=512&height=512&seed=${Date.now() % 1000000}`;

  console.log('[AssetGen] Pollinations URL:', imageUrl.substring(0, 100));
  
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
      note: 'Free tier - 512x512 resolution',
    },
  };
}

/**
 * Generate image using Puter.com AI API — FREE, simple to use.
 * No API key required for basic usage.
 * See: https://developer.puter.com/
 */
async function generateWithPuter(prompt: string): Promise<DreamAsset> {
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
    throw new Error('Puter AI returned no image data');
  }

  return {
    id: makeId(),
    prompt: enhancedPrompt,
    url: imageUrl,
    source: 'puter',
    style: 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'puter.com',
      model: 'stable-diffusion',
      note: 'Free generation via Puter AI API',
    },
  };
}

/**
 * Generate image using local ComfyUI or A1111 (AUTOMATIC1111) instance.
 * Requires running Stable Diffusion locally.
 * Configure via VITE_LOCAL_GEN_URL or use defaults.
 */
async function generateWithLocalProvider(prompt: string): Promise<DreamAsset> {
  console.log('[AssetGen] Generating via local provider...');
  
  const localUrl = import.meta.env.VITE_LOCAL_GEN_URL || '';
  let baseUrl = localUrl;
  let provider: 'comfyui' | 'a1111' | 'unknown' = 'unknown';
  
  // Auto-detect or use specified provider
  if (localUrl.includes('8188')) {
    baseUrl = DEFAULT_COMFYUI_URL;
    provider = 'comfyui';
  } else if (localUrl.includes('7860')) {
    baseUrl = DEFAULT_A1111_URL;
    provider = 'a1111';
  } else if (localUrl) {
    // User provided custom URL, try A1111 first
    baseUrl = localUrl;
    provider = 'a1111';
  } else {
    throw new Error('No local generation URL configured');
  }

  const enhancedPrompt = buildDreamPrompt(prompt);
  
  if (provider === 'a1111') {
    console.log('[AssetGen] Calling A1111 API...');
    const response = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        negative_prompt: 'blurry, low quality, distorted, ugly, watermark',
        steps: 20,
        width: 1024,
        height: 1024,
        cfg_scale: 7,
        sampler_name: 'Euler a',
      }),
    });

    console.log('[AssetGen] A1111 response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`A1111 API failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    if (!result.images?.[0]) {
      throw new Error('A1111 returned no images');
    }

    // Convert base64 to blob URL
    const base64Image = result.images[0];
    const blob = await fetch(`data:image/png;base64,${base64Image}`).then(r => r.blob());
    const imageUrl = URL.createObjectURL(blob);
    
    console.log('[AssetGen] A1111 image generated successfully');
    
    return {
      id: makeId(),
      prompt: enhancedPrompt,
      url: imageUrl,
      source: 'local-a1111',
      style: 'dreamlike',
      generatedAt: new Date().toISOString(),
      metadata: {
        provider: 'local-comfyui',
        model: 'stable-diffusion',
        note: 'Generated locally on your machine',
      },
    };
  } else if (provider === 'comfyui') {
    console.log('[AssetGen] Calling ComfyUI API...');
    
    // ComfyUI workflow for txt2img
    const workflow = {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 7,
          "denoise": 1,
          "latent_image": ["5", 0],
          "model": ["4", 0],
          "negative": ["7", 0],
          "positive": ["6", 0],
          "sampler_name": "euler",
          "scheduler": "normal",
          "seed": Date.now(),
          "steps": 20
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": { "ckpt_name": "v1-5-pruned-emaonly.ckpt" }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": { "batch_size": 1, "height": 1024, "width": 1024 }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": { "clip": ["4", 1], "text": enhancedPrompt }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": { "clip": ["4", 1], "text": "blurry, low quality, distorted, ugly" }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": { "samples": ["3", 0], "vae": ["4", 2] }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": { "filename_prefix": "ComfyUI", "images": ["8", 0] }
      }
    };

    const response = await fetch(`${baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });

    console.log('[AssetGen] ComfyUI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ComfyUI API failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const promptId = result.prompt_id;
    
    // Poll for completion
    console.log('[AssetGen] Waiting for ComfyUI generation to complete...');
    let imageUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts && !imageUrl) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const historyResponse = await fetch(`${baseUrl}/history/${promptId}`);
      if (historyResponse.ok) {
        const history = await historyResponse.json();
        if (history[promptId]?.outputs) {
          const outputs = history[promptId].outputs;
          for (const nodeId in outputs) {
            const output = outputs[nodeId];
            if (output.images) {
              const img = output.images[0];
              imageUrl = `${baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`;
              break;
            }
          }
        }
      }
      attempts++;
    }
    
    if (!imageUrl) {
      throw new Error('ComfyUI generation timed out');
    }
    
    console.log('[AssetGen] ComfyUI image generated successfully');
    
    return {
      id: makeId(),
      prompt: enhancedPrompt,
      url: imageUrl,
      source: 'local-comfyui',
      style: 'dreamlike',
      generatedAt: new Date().toISOString(),
      metadata: {
        provider: 'local-comfyui',
        model: 'stable-diffusion',
        note: 'Generated locally on your machine',
      },
    };
  }
  
  throw new Error('Unknown local provider');
}

// Note: generateWithHuggingFace function removed as part of 2-stage simplification
// The HuggingFace constant is also removed from the top of the file

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
 * Main image generation function — 2-Stage Process:
 * 
 * STAGE 1: Cloud APIs (Try in order)
 *   1a. Puter.com AI API - FREE, easy to use (https://developer.puter.com/)
 *   1b. Supabase Edge Function (handles CORS, proxies Pollinations) - FREE
 *   1c. Direct Pollinations.ai - FREE, no API key needed
 * 
 * STAGE 2: Local Generation (if enabled and cloud fails)
 *   2a. AUTOMATIC1111 Stable Diffusion WebUI - Free, full control
 *   2b. ComfyUI - Free, workflow-based
 * 
 * FALLBACK:
 *   3. SVG placeholder - Always works
 * 
 * Each step logs its progress for debugging.
 * 
 * @param prompt - The dream text or description to visualize
 * @returns Promise resolving to DreamAsset with image URL and metadata
 */
export async function generateDreamImage(prompt: string): Promise<DreamAsset> {
  console.log('[AssetGen] Starting image generation for prompt:', prompt.substring(0, 50));
  
  // ========== STAGE 1: Cloud APIs ==========
  
  try {
    // First: Try Puter.com AI API (FREE, simple)
    console.log('[AssetGen] Attempting Puter.com AI...');
    return await generateWithPuter(prompt);
  } catch (puterError) {
    console.warn('[AssetGen] Puter.com failed:', puterError);
  }

  try {
    // Second: Try Supabase Edge Function (handles CORS)
    console.log('[AssetGen] Attempting Edge Function...');
    return await generateWithEdgeFunction(prompt);
  } catch (edgeError) {
    console.warn('[AssetGen] Edge function failed:', edgeError);
  }

  try {
    // Third: Direct Pollinations (may have CORS issues in some browsers)
    console.log('[AssetGen] Attempting Pollinations direct...');
    return await generateWithPollinations(prompt);
  } catch (pollinationsError) {
    console.warn('[AssetGen] Pollinations failed:', pollinationsError);
  }

  // ========== STAGE 2: Local Generation (Optional) ==========
  
  const enableLocal = import.meta.env.VITE_ENABLE_LOCAL_GEN === 'true';
  
  if (enableLocal) {
    try {
      // Fourth: Local generation (ComfyUI or A1111)
      console.log('[AssetGen] Attempting local provider...');
      return await generateWithLocalProvider(prompt);
    } catch (localError) {
      console.warn('[AssetGen] Local provider failed:', localError);
    }
  } else {
    console.log('[AssetGen] Local generation disabled (set VITE_ENABLE_LOCAL_GEN=true to enable)');
  }

  // ========== FALLBACK ==========
  
  // Final fallback: SVG placeholder
  console.warn('[AssetGen] All providers failed, using SVG placeholder');
  return await generateFallbackImage(prompt);
}

/**
 * Generate multiple dream assets (for future batch processing)
 */
export async function generateDreamAssets(prompts: string[]): Promise<DreamAsset[]> {
  return Promise.all(prompts.map(prompt => generateDreamImage(prompt)));
}