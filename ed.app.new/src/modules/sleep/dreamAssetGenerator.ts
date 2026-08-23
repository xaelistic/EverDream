// Image generation via the generate-image edge function (OpenRouter primary).

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DreamAsset } from './types';
import { consumeImageCredits, refundImageCredits } from '../../lib/subscriptions/creditService';
import { applyTasteToPrompt, pickImageRecipe } from '../../lib/imageTaste';
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

function isUsableImageUrl(url: unknown): url is string {
  return typeof url === 'string' && (
    url.startsWith('data:image/') ||
    url.startsWith('https://') ||
    url.startsWith('blob:')
  );
}

interface EdgeImageResponse {
  imageUrl?: string;
  source?: string;
  model?: string | null;
  cost_usd?: number | null;
  prompt?: string;
  error?: string;
}

function assetFromEdge(data: EdgeImageResponse, prompt: string, style: string): DreamAsset {
  if (!isUsableImageUrl(data.imageUrl)) {
    throw new Error(data.error || 'Image service returned no image');
  }
  const source = data.source === 'openrouter' ? 'openrouter' : 'edge-function';
  return {
    id: makeId(),
    prompt: data.prompt || prompt,
    url: data.imageUrl,
    source,
    style,
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: data.model || data.source || 'generate-image',
      model: data.model || undefined,
      estimated_cost_usd: typeof data.cost_usd === 'number' ? data.cost_usd : undefined,
    },
  };
}

async function generateViaEdgeFunction(prompt: string, style: string, look?: string): Promise<DreamAsset> {
  const spent = await consumeImageCredits(1, 'image_generation');
  if (!spent.ok) {
    throw new Error(`Out of image credits (${spent.remaining} left). Buy a pack or upgrade on Plan & credits.`);
  }

  const supabase = getSupabase();
  const body = { prompt, style, look, width: 1024, height: 1024, format: 'json' as const };

  try {
    if (supabase) {
      const { data, error } = await supabase.functions.invoke('generate-image', { body });
      if (!error && data) {
        return assetFromEdge(data as EdgeImageResponse, prompt, style);
      }
      console.warn('[AssetGen] functions.invoke failed:', error?.message || data);
    }

    const url = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    if (!url || !key) throw new Error('Supabase is not configured for image generation');

    const response = await fetch(`${url.replace(/\/$/, '')}/functions/v1/generate-image`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({})) as EdgeImageResponse;
    if (!response.ok) {
      throw new Error(payload.error || `Image generation failed (${response.status})`);
    }
    return assetFromEdge(payload, prompt, style);
  } catch (err) {
    await refundImageCredits(1, 'image_generation_failed');
    throw err;
  }
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

export async function generateDreamImage(prompt: string, style = 'auto'): Promise<DreamAsset> {
  const text = (prompt || '').trim();
  if (text.length < 3) {
    throw new Error('Need a bit more dream text before an image can be generated.');
  }

  const recipe = pickImageRecipe();
  const chosenStyle = !style || style === 'auto' || style === 'dreamlike' ? recipe.style : style;
  const tasted = applyTasteToPrompt(text);

  console.log('[AssetGen] recipe', recipe.id, 'style', chosenStyle);

  const ollamaEnabled = import.meta.env.VITE_OLLAMA_ENABLED === 'true' && !!import.meta.env.VITE_OLLAMA_URL;
  if (ollamaEnabled) {
    try {
      const local = await generateWithOllama(`${tasted}, ${recipe.fragment}`, chosenStyle);
      return {
        ...local,
        style: `${chosenStyle}:${recipe.id}`,
        metadata: { ...local.metadata, recipeId: recipe.id, recipeLook: recipe.fragment },
      };
    } catch (error) {
      console.warn('[AssetGen] Ollama failed, using OpenRouter edge function:', error);
    }
  }

  const asset = await generateViaEdgeFunction(tasted, chosenStyle, recipe.fragment);
  return {
    ...asset,
    style: `${chosenStyle}:${recipe.id}`,
    metadata: {
      ...asset.metadata,
      recipeId: recipe.id,
      recipeLook: recipe.fragment,
    },
  };
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