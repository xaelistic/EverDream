/**
 * Dream Analysis Pipeline — Multi-Provider
 *
 * Complete pipeline: Audio → Transcription → AI Analysis → Image → Parallax Video
 *
 * All AI analysis goes through the Supabase Edge Function "analyze-dream"
 * which handles provider fallback automatically:
 *   OpenRouter (free) → Pollinations (free) → Gemini (free tier) → OpenAI (cheap) → NVIDIA Nemotron (open source)
 *
 * Image generation: Pollinations.ai (free, unlimited) → HF SDXL fallback
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Supabase anon/public key
 */

import { transcribeAudio, type TranscriptionResult } from './transcriptionWhisper';
import { analyzeDream, type DreamAnalysis } from './dream-analyzer';
import { generateDreamImage, type DreamAsset } from '../modules/sleep/dreamAssetGenerator';
import { generateParallaxVideo } from './assets/pipeline';

// ============================================================
// TYPES
// ============================================================

export interface PipelineInput {
  /** Raw audio data (File, Blob, ArrayBuffer, or data URL) */
  audioData?: Blob | File | ArrayBuffer | string;
  /** Pre-transcribed text (skip transcription step) */
  text?: string;
  /** Language hint for transcription (e.g., 'en', 'auto') */
  language?: string;
}

export interface PipelineStep {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  progress?: number;
  error?: string;
  result?: string;
}

export interface PipelineResult {
  transcription: TranscriptionResult | null;
  analysis: DreamAnalysis | null;
  image: DreamAsset | null;
  parallaxVideoUrl: string | null;
  steps: PipelineStep[];
  totalDuration: number;
}

export type PipelineProgressCallback = (
  step: string,
  status: PipelineStep['status'],
  message: string
) => void;

// ============================================================
// PIPELINE STEPS
// ============================================================

const STEP_NAMES = {
  transcribe: 'Transcription',
  analyze: 'Dream Analysis',
  image: 'Image Generation',
  parallax: 'Parallax Video',
} as const;

function createInitialSteps(): PipelineStep[] {
  return [
    { name: STEP_NAMES.transcribe, status: 'pending' },
    { name: STEP_NAMES.analyze, status: 'pending' },
    { name: STEP_NAMES.image, status: 'pending' },
    { name: STEP_NAMES.parallax, status: 'pending' },
  ];
}

function updateStep(
  steps: PipelineStep[],
  name: string,
  update: Partial<PipelineStep>
): PipelineStep[] {
  return steps.map((s) => (s.name === name ? { ...s, ...update } : s));
}

// ============================================================
// MAIN PIPELINE
// ============================================================

/**
 * Run the complete dream analysis pipeline.
 *
 * @param input — Audio data or pre-transcribed text
 * @param options — Which steps to run, progress callback
 * @returns Complete pipeline result
 */
export async function runDreamPipeline(
  input: PipelineInput,
  options: {
    skipTranscription?: boolean;
    skipAnalysis?: boolean;
    skipImage?: boolean;
    skipParallax?: boolean;
    onProgress?: PipelineProgressCallback;
  } = {}
): Promise<PipelineResult> {
  const startTime = Date.now();
  let steps = createInitialSteps();

  const report = (stepName: string, status: PipelineStep['status'], message: string) => {
    steps = updateStep(steps, stepName, { status, result: message });
    options.onProgress?.(stepName, status, message);
  };

  let transcription: TranscriptionResult | null = null;
  let analysis: DreamAnalysis | null = null;
  let image: DreamAsset | null = null;
  let parallaxVideoUrl: string | null = null;

  // ── Step 1: Transcription ──────────────────────────────────
  if (!options.skipTranscription && input.audioData) {
    report(STEP_NAMES.transcribe, 'running', 'Transcribing audio...');

    try {
      transcription = await transcribeAudio(input.audioData, {
        language: input.language || 'en',
        onProgress: (status) => report(STEP_NAMES.transcribe, 'running', status),
      });

      if (!transcription.text || transcription.text.length < 5) {
        throw new Error('Transcription returned empty or too short');
      }

      report(STEP_NAMES.transcribe, 'done', transcription.text.substring(0, 80) + '...');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      report(STEP_NAMES.transcribe, 'error', msg);
      // Continue with empty text — user can type manually
      transcription = { text: '', source: 'fallback' };
    }
  } else {
    steps = updateStep(steps, STEP_NAMES.transcribe, { status: 'skipped' });
  }

  // Get the text to analyze (from transcription or input)
  const dreamText = input.text || transcription?.text || '';

  // ── Step 2: AI Analysis ─────────────────────────────────────
  if (!options.skipAnalysis && dreamText.length > 10) {
    report(STEP_NAMES.analyze, 'running', 'Analyzing dream symbols and themes...');

    try {
      analysis = await analyzeDream(dreamText);
      report(
        STEP_NAMES.analyze,
        'done',
        `Category: ${analysis.category} | Themes: ${analysis.themes.join(', ')}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      report(STEP_NAMES.analyze, 'error', msg);
      analysis = null;
    }
  } else {
    steps = updateStep(steps, STEP_NAMES.analyze, {
      status: dreamText.length <= 10 ? 'skipped' : 'error',
      error: dreamText.length <= 10 ? 'Text too short for analysis' : undefined,
    });
  }

  // ── Step 3: Image Generation (FREE — Pollinations) ──────────
  if (!options.skipImage && analysis) {
    report(STEP_NAMES.image, 'running', 'Generating dream image...');

    try {
      const imagePrompt = analysis.narrative || analysis.nugget || dreamText;
      image = await generateDreamImage(imagePrompt);
      report(STEP_NAMES.image, 'done', `Image generated (${image.source})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image generation failed';
      report(STEP_NAMES.image, 'error', msg);
    }
  } else {
    steps = updateStep(steps, STEP_NAMES.image, { status: 'skipped' });
  }

  // ── Step 4: Parallax Video (FREE — client-side canvas) ──────
  if (!options.skipParallax && image?.url) {
    report(STEP_NAMES.parallax, 'running', 'Creating parallax video...');

    try {
      // Generate parallax video from the dream image
      // Uses canvas-based rendering — no external API needed
      parallaxVideoUrl = await generateParallaxVideo(
        image.url,
        image.url, // Use image as its own depth map fallback (still creates nice motion)
        {
          duration: 5,
          fps: 24,
          amplitude: 0.1,
          direction: 'circular',
        }
      );

      report(STEP_NAMES.parallax, 'done', 'Parallax video ready');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Parallax generation failed';
      report(STEP_NAMES.parallax, 'error', msg);
      // Non-critical — image is still available
    }
  } else {
    steps = updateStep(steps, STEP_NAMES.parallax, { status: 'skipped' });
  }

  const totalDuration = Date.now() - startTime;

  return {
    transcription,
    analysis,
    image,
    parallaxVideoUrl,
    steps,
    totalDuration,
  };
}

/**
 * Quick pipeline — text only (no audio).
 * Analyzes text → generates image → creates parallax video.
 */
export async function analyzeAndVisualize(
  text: string,
  onProgress?: PipelineProgressCallback
): Promise<PipelineResult> {
  return runDreamPipeline(
    { text },
    {
      skipTranscription: true,
      onProgress,
    }
  );
}

/**
 * Audio-only pipeline — transcribe then analyze.
 * Does NOT generate image/video (for quick transcription).
 */
export async function transcribeAndAnalyze(
  audioData: Blob | File | ArrayBuffer | string,
  onProgress?: PipelineProgressCallback
): Promise<PipelineResult> {
  return runDreamPipeline(
    { audioData },
    {
      skipImage: true,
      skipParallax: true,
      onProgress,
    }
  );
}
