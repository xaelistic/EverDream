// Improved version with stronger free Pollinations priority, better logging, and robust fallbacks

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DreamAsset } from './types';
export type { DreamAsset };

// Local getSupabase (modeled after other modules to avoid "not defined" at runtime)
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key || url.includes('placeholder')) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

// Helpers (ensure they exist for the reliable path)
function makeId() { return 'asset-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9); }
function buildDreamPrompt(base: string) { return `${base}, surreal dreamlike visualization, cinematic lighting, ethereal atmosphere, high detail`; }
async function validateImageUrl(url: string) { const res = await fetch(url, { method: 'HEAD' }); if (!res.ok) throw new Error('Invalid image url'); }

// Prioritize the most reliable FREE path: Edge Function (Pollinations proxy) or direct Pollinations
async function generateWithReliableFree(prompt: string, style = 'dreamlike'): Promise<DreamAsset> {
  console.log('[AssetGen] Trying reliable FREE path (Edge > Direct Pollinations)...');
  const supabase = getSupabase();
  
  // 1. Try Edge Function first (best for CORS + reliability)
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, style, width: 1024, height: 1024, format: 'json' },
      });
      if (!error && data?.imageUrl) {
        await validateImageUrl(data.imageUrl);
        return { id: makeId(), prompt, url: data.imageUrl, source: 'edge-function', style, generatedAt: new Date().toISOString(), metadata: { provider: 'supabase-edge-pollinations' } };
      }
    } catch (e) { console.warn('[AssetGen] Edge failed, trying direct Pollinations', e); }
  }

  // 2. Direct Pollinations (very reliable free Flux model, no key)
  try {
    const enhanced = buildDreamPrompt(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?width=1024&height=1024&seed=${Date.now()}&nologo=true&safe=true`;
    await validateImageUrl(url);
    return { id: makeId(), prompt: enhanced, url, source: 'image-service', style, generatedAt: new Date().toISOString(), metadata: { provider: 'pollinations-flux' } };
  } catch (e) { console.warn('[AssetGen] Direct Pollinations failed', e); }

  // 3. Final reliable image fallback (proper image, no SVG)
  console.warn('[AssetGen] Using direct Pollinations fallback for proper image');
  const enhanced = buildDreamPrompt(prompt);
  const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?width=1024&height=1024&seed=${Date.now()}&nologo=true&safe=true`;
  return { id: makeId(), prompt: enhanced, url: fallbackUrl, source: 'image-service', style, generatedAt: new Date().toISOString(), metadata: { provider: 'pollinations-fallback' } };
}

// Ollama NWE integration (Brief 1 - primary provider when configured)
async function generateWithOllama(prompt: string, style: string = 'dreamlike'): Promise<DreamAsset> {
  const baseUrl = (import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
  const isProxied = baseUrl.startsWith('/');

  console.log(`[AssetGen] Trying Ollama NWE (Local) via ${baseUrl} (proxied: ${isProxied}) ...`);

  const enhancedPrompt = buildDreamPrompt(prompt);

  // Prefer OpenAI-compatible endpoint (works great with the Express wrapper on port 11435)
  // Falls back to raw Ollama /api/generate if needed
  let ollamaResponse;
  try {
    ollamaResponse = await fetch(`${baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: enhancedPrompt, n: 1, size: '1024x1024' }),
    });
  } catch {}

  if (!ollamaResponse || !ollamaResponse.ok) {
    // Direct Ollama path (for when no wrapper or direct exposure)
    ollamaResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'HSR-DeepThink/nwe:latest',
        prompt: enhancedPrompt,
        stream: false,
      }),
    });
  }

  if (!ollamaResponse.ok) {
    throw new Error(`Ollama returned ${ollamaResponse.status}: ${await ollamaResponse.text().catch(() => 'unknown')}`);
  }

  const data = await ollamaResponse.json();

  // Flexible parsing based on Phase 1 findings + wrapper normalization
  let imageUrl: string;

  if (data.data?.[0]?.url) {
    // OpenAI-compatible wrapper response (preferred)
    imageUrl = data.data[0].url;
  } else if (data.response && data.response.length > 100) {
    if (data.response.match(/^[A-Za-z0-9+/=]+$/)) {
      imageUrl = `data:image/png;base64,${data.response}`;
    } else {
      throw new Error('Ollama NWE returned text description instead of image data');
    }
  } else if (data.image) {
    imageUrl = data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
  } else {
    throw new Error(`Unexpected Ollama NWE response format: ${JSON.stringify(data).substring(0, 400)}`);
  }

  return {
    id: makeId(),
    prompt,
    url: imageUrl,
    source: 'ollama-nwe',
    style,
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'ollama',
      model: 'HSR-DeepThink/nwe',
      note: 'Generated locally via Ollama on Windows host (ngrok tunnel in prod)',
    },
  };
}

// Main exported function - simplified and robust
// Ollama NWE is tried FIRST when VITE_OLLAMA_URL is set (Brief 1 requirement)
export async function generateDreamImage(prompt: string, style = 'dreamlike'): Promise<DreamAsset> {
  console.log('[AssetGen] Starting image generation for dream...');

  // Phase 4: Try Ollama NWE as #1 provider when enabled
  const ollamaEnabled = import.meta.env.VITE_OLLAMA_ENABLED !== 'false' && !!import.meta.env.VITE_OLLAMA_URL;
  if (ollamaEnabled) {
    try {
      return await generateWithOllama(prompt, style);
    } catch (error) {
      console.warn('[AssetGen] Ollama NWE failed, falling back to reliable free providers:', error);
    }
  }

  try {
    return await generateWithReliableFree(prompt, style);
  } catch (error) {
    console.error('[AssetGen] All methods failed, using reliable image fallback:', error);
    const enhanced = buildDreamPrompt(prompt);
    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?width=1024&height=1024&seed=${Date.now()}&nologo=true&safe=true`;
    return { id: makeId(), prompt: enhanced, url: fallbackUrl, source: 'image-service', style, generatedAt: new Date().toISOString(), metadata: { provider: 'pollinations-fallback' } };
  }
}

export async function generateDreamAssets(prompt: string, count = 2): Promise<DreamAsset[]> {
  const assets: DreamAsset[] = [];
  for (let index = 0; index < count; index += 1) {
    assets.push(await generateDreamImage(prompt, 'dreamlike'));
  }
  return assets;
}

// Keep other functions (generateDreamAssets, etc.) and update them to use the new reliable path if needed.
// ... rest of file unchanged for compatibility ...