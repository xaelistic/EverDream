/**
 * Dream Pipeline — Supabase Persistence Bridge
 *
 * Bridges the dream analysis pipeline results to Supabase database.
 * Saves dreams, analysis, generated images, and NFT records.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Supabase anon/public key
 */

import { supabase, type DreamRecord } from '../supabase/client';
import type { PipelineResult } from './dreamPipeline';
import type { DreamAnalysis } from './dream-analyzer';
import type { DreamAsset } from '../modules/sleep/dreamAssetGenerator';

// ── Types ────────────────────────────────────────────────────

export interface SaveDreamOptions {
  /** The user ID to save under */
  userId: string;
  /** Original dream text (from user input or transcription) */
  dreamText: string;
  /** Pipeline result (analysis, image, etc.) */
  pipelineResult: PipelineResult;
  /** Capture mode */
  captureMode?: 'text' | 'audio' | 'video';
  /** Visibility setting */
  visibility?: 'private' | 'trusted' | 'public';
}

export interface SaveDreamResult {
  success: boolean;
  dreamId: string | null;
  error?: string;
}

// ── Main Save Function ───────────────────────────────────────

/**
 * Save a complete dream (with analysis + image) to Supabase.
 * This is the main entry point after the pipeline runs.
 *
 * @param options — SaveDreamOptions with userId, dreamText, pipelineResult
 * @returns SaveDreamResult with success status and dream ID
 *
 * @example
 * ```ts
 * const result = await saveDreamToSupabase({
 *   userId: user.id,
 *   dreamText: 'I was flying over mountains...',
 *   pipelineResult: pipelineResult,
 *   captureMode: 'text',
 * });
 * if (result.success) {
 *   console.log('Dream saved:', result.dreamId);
 * }
 * ```
 */
export async function saveDreamToSupabase(options: SaveDreamOptions): Promise<SaveDreamResult> {
  const { userId, dreamText, pipelineResult, captureMode = 'text', visibility = 'private' } = options;

  if (!userId) {
    console.error('[Persistence] No user ID provided');
    return { success: false, dreamId: null, error: 'No user ID provided' };
  }

  if (!dreamText || dreamText.trim().length === 0) {
    console.error('[Persistence] No dream text provided');
    return { success: false, dreamId: null, error: 'No dream text provided' };
  }

  try {
    const analysis = pipelineResult.analysis;
    const image = pipelineResult.image;

    // Build the dream record
    const dreamRecord: Partial<DreamRecord> = {
      id: generateDreamId(),
      user_id: userId,
      content: dreamText.trim(),
      transcript: pipelineResult.transcription?.text || null,
      capture_mode: captureMode,
      category: analysis?.category || 'uncategorized',
      themes: analysis?.themes || [],
      emotion: analysis?.emotion || 'neutral',
      symbols: analysis?.symbols || [],
      narrative: analysis?.narrative || null,
      nugget: analysis?.nugget || null,
      interpretation: analysis?.interpretation as unknown as Record<string, unknown> || null,
      mood_valence: calculateValence(analysis),
      generated_image_url: image?.url || null,
      generated_image_prompt: image?.prompt || null,
      generated_image_style: image?.style || 'dreamlike',
      generated_image_source: image?.source || null,
      visibility,
      is_sample: false,
      is_deleted: false,
    };

    console.log('[Persistence] Saving dream:', dreamRecord.id);

    const saved = await supabase.from('dreams').insert(dreamRecord).select().single();

    if (saved.error) {
      console.error('[Persistence] Failed to save dream:', saved.error);
      return { success: false, dreamId: null, error: saved.error.message };
    }

    console.log('[Persistence] Dream saved successfully:', saved.data.id);

    // If there's a generated image, also save it to dream_assets
    if (image?.url) {
      await saveDreamAsset(saved.data.id, userId, image);
    }

    return { success: true, dreamId: saved.data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Persistence] Unexpected error:', message);
    return { success: false, dreamId: null, error: message };
  }
}

/**
 * Save a generated image/asset to the dream_assets table.
 */
async function saveDreamAsset(
  dreamId: string,
  userId: string,
  asset: DreamAsset
): Promise<void> {
  try {
    const { error } = await supabase.from('dream_assets').insert({
      dream_id: dreamId,
      user_id: userId,
      asset_type: 'image',
      prompt: asset.prompt,
      url: asset.url,
      source: asset.source,
      style: asset.style || 'dreamlike',
      metadata: asset.metadata || {},
      status: 'completed',
      attempts: 1,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[Persistence] Failed to save dream asset:', error);
    }
  } catch (err) {
    console.error('[Persistence] Error saving dream asset:', err);
  }
}

/**
 * Save an NFT record to Supabase after minting.
 *
 * @param nftData — NFT data from the NFT module
 * @param dreamId — The dream ID this NFT represents
 * @param userId — The user ID
 */
export async function saveNFTToSupabase(
  nftData: {
    id: string;
    owner: string;
    creator: string;
    metadata: {
      name: string;
      description: string;
      image?: string;
      animation_url?: string;
      external_url?: string;
      attributes?: Array<{ trait_type: string; value: string | number }>;
    };
    status: 'pending' | 'minted' | 'failed';
    txHash?: string;
    contractAddress?: string;
    tokenId?: string;
    parents?: string[];
    royaltySplits?: Array<{ wallet: string; share: number }>;
    license: string;
    allowRemix: boolean;
  },
  dreamId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('nfts').insert({
      id: nftData.id,
      dream_id: dreamId,
      user_id: userId,
      owner_address: nftData.owner,
      creator_address: nftData.creator,
      name: nftData.metadata.name,
      description: nftData.metadata.description,
      image_url: nftData.metadata.image,
      animation_url: nftData.metadata.animation_url,
      external_url: nftData.metadata.external_url,
      metadata: nftData.metadata as unknown as Record<string, unknown>,
      attributes: nftData.metadata.attributes as unknown as Record<string, unknown>[],
      status: nftData.status,
      tx_hash: nftData.txHash,
      contract_address: nftData.contractAddress,
      token_id: nftData.tokenId,
      parent_nft_ids: nftData.parents,
      royalty_splits: nftData.royaltySplits as unknown as Record<string, unknown>,
      license: nftData.license,
      allow_remix: nftData.allowRemix,
      minted_at: nftData.status === 'minted' ? new Date().toISOString() : null,
    });

    if (error) {
      console.error('[Persistence] Failed to save NFT:', error);
      return { success: false, error: error.message };
    }

    console.log('[Persistence] NFT saved:', nftData.id);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Persistence] Error saving NFT:', message);
    return { success: false, error: message };
  }
}

/**
 * Update an existing dream record with pipeline results.
 * Use this when you want to add analysis/image to an existing dream.
 *
 * @param dreamId — The dream ID to update
 * @param analysis — DreamAnalysis result
 * @param image — DreamAsset (generated image)
 */
export async function updateDreamWithResults(
  dreamId: string,
  analysis: DreamAnalysis | null,
  image: DreamAsset | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: Partial<DreamRecord> = {};

    if (analysis) {
      updates.category = analysis.category;
      updates.themes = analysis.themes;
      updates.emotion = analysis.emotion;
      updates.symbols = analysis.symbols;
      updates.narrative = analysis.narrative;
      updates.nugget = analysis.nugget;
      updates.interpretation = analysis.interpretation as unknown as Record<string, unknown>;
      updates.mood_valence = calculateValence(analysis);
    }

    if (image) {
      updates.generated_image_url = image.url;
      updates.generated_image_prompt = image.prompt;
      updates.generated_image_style = image.style || 'dreamlike';
      updates.generated_image_source = image.source;
    }

    const { error } = await supabase
      .from('dreams')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', dreamId)
      .select()
      .single();

    if (error) {
      console.error('[Persistence] Failed to update dream:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Generate a unique dream ID.
 * Format: dream-{timestamp}-{random}
 */
function generateDreamId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `dream-${timestamp}-${random}`;
}

/**
 * Calculate emotional valence (-1 to 1) from analysis.
 * Maps common emotions to a numerical scale.
 */
function calculateValence(analysis: DreamAnalysis | null): number | null {
  if (!analysis) return null;

  const emotionMap: Record<string, number> = {
    'joy': 0.9,
    'happiness': 0.9,
    'excitement': 0.8,
    'wonder': 0.7,
    'peace': 0.6,
    'calm': 0.5,
    'neutral': 0,
    'confusion': -0.1,
    'anxiety': -0.4,
    'fear': -0.6,
    'sadness': -0.7,
    'anger': -0.8,
    'terror': -0.9,
    'horror': -0.9,
  };

  const emotion = analysis.emotion?.toLowerCase() || '';
  return emotionMap[emotion] ?? 0;
}
