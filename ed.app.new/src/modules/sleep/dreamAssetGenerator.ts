// Improved version with stronger free Pollinations priority, better logging, and robust fallbacks

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DreamAsset } from './types';
export type { DreamAsset };

// ... (keep all existing helpers: makeId, buildDreamPrompt, validateImageUrl, etc.)

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

  // 3. Final SVG fallback (always works)
  return generateDynamicSVG(prompt, style);
}

// Main exported function - simplified and robust
export async function generateDreamImage(prompt: string, style = 'dreamlike'): Promise<DreamAsset> {
  console.log('[AssetGen] Starting image generation for dream...');
  try {
    return await generateWithReliableFree(prompt, style);
  } catch (error) {
    console.error('[AssetGen] All methods failed, using SVG fallback:', error);
    return generateDynamicSVG(prompt, style);
  }
}

// Keep other functions (generateDreamAssets, etc.) and update them to use the new reliable path if needed.
// ... rest of file unchanged for compatibility ...