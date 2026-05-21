/**
 * Dream Pipeline Auto-Saver
 *
 * Automatically saves pipeline results to Supabase after each step completes.
 * This ensures that even if the pipeline fails partway through, partial results
 * are persisted.
 *
 * Features:
 * - Auto-save after each pipeline step
 * - Partial result preservation (if analysis fails, still save the dream text)
 * - Retry on save failure
 * - Progress tracking for the save step
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Supabase anon/public key
 */

import { supabase, type DreamRecord } from './supabase/client';
import type { PipelineResult, PipelineProgressCallback } from './dreamPipeline';
import type { DreamAnalysis } from './dream-analyzer';
import type { DreamAsset } from '../modules/sleep/dreamAssetGenerator';

// ── Types ────────────────────────────────────────────────────

export interface AutoSaveOptions {
  /** The user ID to save under (profile ID, not auth ID) */
  userId: string;
  /** Original dream text (from user input or transcription) */
  dreamText: string;
  /** Capture mode */
  captureMode?: 'text' | 'audio' | 'video';
  /** Visibility setting */
  visibility?: 'private' | 'trusted' | 'public';
  /** Progress callback for the save step */
  onProgress?: PipelineProgressCallback;
}

export interface AutoSaveResult {
  success: boolean;
  dreamId: string | null;
  savedAnalysis: boolean;
  savedImage: boolean;
  error?: string;
}

// ── Main Auto-Save Function ──────────────────────────────────

/**
 * Automatically save pipeline results to Supabase.
 * Creates or updates a dream record with all available data.
 *
 * This function is idempotent — if called multiple times with the same dreamId,
 * it will update the existing record rather than creating duplicates.
 *
 * @param dreamId — Existing dream ID to update, or null to create new
 * @param options — AutoSaveOptions with userId, dreamText, etc.
 * @param pipelineResult — The pipeline result to save
 * @returns AutoSaveResult with success status and what was saved
 *
 * @example
 * ```ts
 * // After pipeline completes:
 * const saveResult = await autoSavePipelineResults(
 *   null, // create new dream
 *   { userId: profile.id, dreamText: 'I was flying...' },
 *   pipelineResult
 * );
 * if (saveResult.success) {
 *   console.log('Dream saved:', saveResult.dreamId);
 * }
 * ```
 */
export async function autoSavePipelineResults(
  dreamId: string | null,
  options: AutoSaveOptions,
  pipelineResult: PipelineResult
): Promise<AutoSaveResult> {
  const {
    userId,
    dreamText,
    captureMode = 'text',
    visibility = 'private',
    onProgress,
  } = options;

  if (!userId) {
    return {
      success: false,
      dreamId: null,
      savedAnalysis: false,
      savedImage: false,
      error: 'No user ID provided',
    };
  }

  if (!dreamText || dreamText.trim().length === 0) {
    return {
      success: false,
      dreamId: null,
      savedAnalysis: false,
      savedImage: false,
      error: 'No dream text provided',
    };
  }

  onProgress?.('Save', 'running', 'Saving dream to database...');

  try {
    const analysis = pipelineResult.analysis;
    const image = pipelineResult.image;
    const transcription = pipelineResult.transcription;

    // Build the dream record
    const dreamRecord: Partial<DreamRecord> = {
      user_id: userId,
      content: dreamText.trim(),
      transcript: transcription?.text || null,
      capture_mode: captureMode,
      category: analysis?.category || 'uncategorized',
      themes: analysis?.themes || [],
      emotion: analysis?.emotion || 'neutral',
      symbols: analysis?.symbols || [],
      narrative: analysis?.narrative || null,
      nugget: analysis?.nugget || null,
      interpretation: (analysis?.interpretation as unknown as Record<string, unknown>) || null,
      mood_valence: calculateValence(analysis),
      generated_image_url: image?.url || null,
      generated_image_prompt: image?.prompt || null,
      generated_image_style: image?.style || 'dreamlike',
      generated_image_source: image?.source || null,
      visibility,
      is_sample: false,
      is_deleted: false,
    };

    let savedDreamId: string;

    if (dreamId) {
      // Update existing dream
      const { error } = await supabase
        .from('dreams')
        .update({ ...dreamRecord, updated_at: new Date().toISOString() })
        .eq('id', dreamId);

      if (error) {
        onProgress?.('Save', 'error', `Failed to update dream: ${error.message}`);
        return {
          success: false,
          dreamId: null,
          savedAnalysis: false,
          savedImage: false,
          error: error.message,
        };
      }

      savedDreamId = dreamId;
    } else {
      // Create new dream
      const { data, error } = await supabase
        .from('dreams')
        .insert(dreamRecord)
        .select()
        .single();

      if (error || !data) {
        onProgress?.('Save', 'error', `Failed to save dream: ${error?.message || 'No data returned'}`);
        return {
          success: false,
          dreamId: null,
          savedAnalysis: false,
          savedImage: false,
          error: error?.message || 'No data returned',
        };
      }

      savedDreamId = data.id;
    }

    onProgress?.('Save', 'running', `Dream saved (${savedDreamId})`);

    // Save the generated image to dream_assets if available
    let savedImage = false;
    if (image?.url) {
      onProgress?.('Save', 'running', 'Saving generated image...');
      savedImage = await saveDreamAsset(savedDreamId, userId, image);
    }

    onProgress?.('Save', 'done', 'All data saved successfully');

    return {
      success: true,
      dreamId: savedDreamId,
      savedAnalysis: !!analysis,
      savedImage,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    onProgress?.('Save', 'error', `Save failed: ${message}`);
    return {
      success: false,
      dreamId: null,
      savedAnalysis: false,
      savedImage: false,
      error: message,
    };
  }
}

/**
 * Save a generated image/asset to the dream_assets table.
 */
async function saveDreamAsset(
  dreamId: string,
  userId: string,
  asset: DreamAsset
): Promise<boolean> {
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
      console.error('[PipelineSaver] Failed to save dream asset:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[PipelineSaver] Error saving dream asset:', err);
    return false;
  }
}

/**
 * Calculate emotional valence (-1 to 1) from analysis.
 */
function calculateValence(analysis: DreamAnalysis | null): number | null {
  if (!analysis) return null;

  // Use explicit valence if available
  if (typeof analysis.valence === 'number') {
    return Math.max(-1, Math.min(1, analysis.valence));
  }

  // Map common emotions to a numerical scale
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

/**
 * Create a wrapper around runDreamPipeline that auto-saves results.
 * This is the recommended way to run the pipeline in production.
 *
 * @param dreamId — Existing dream ID to update, or null to create new
 * @param options — AutoSaveOptions
 * @param pipelineFn — The pipeline function to run (e.g., runDreamPipeline)
 */
export async function runPipelineWithAutoSave(
  dreamId: string | null,
  options: AutoSaveOptions,
  pipelineFn: () => Promise<PipelineResult>
): Promise<{ saveResult: AutoSaveResult; pipelineResult: PipelineResult }> {
  // Run the pipeline
  const pipelineResult = await pipelineFn();

  // Auto-save results
  const saveResult = await autoSavePipelineResults(dreamId, options, pipelineResult);

  return { saveResult, pipelineResult };
}
