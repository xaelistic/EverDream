import React, { useState, useCallback } from 'react';
import { Sparkles, Wand2, Image, Brain, Type } from 'lucide-react';
import { Button, Card } from '../ui';
import PipelineProgress from './PipelineProgress';
import { analyzeDream } from '../../lib/dream-analyzer';
import { generateDreamImage } from '../../modules/sleep/dreamAssetGenerator';
import type { DreamAnalysis } from '../../lib/dream-analyzer';
import type { DreamAsset } from '../../modules/sleep/types';

export interface DreamCaptureResult {
  analysis: DreamAnalysis;
  image: DreamAsset | null;
}

interface DreamCaptureProps {
  /** Initial text (e.g., from transcription) */
  initialText?: string;
  /** Callback when analysis + image generation is complete */
  onComplete: (result: DreamCaptureResult, text: string) => void;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Whether to auto-start analysis */
  autoStart?: boolean;
}

type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

interface Step {
  name: string;
  status: StepStatus;
  message: string;
}

/**
 * DreamCapture — Full dream capture with pipeline progress.
 *
 * Wires the dream analysis pipeline to the UI:
 * 1. User types or records a dream
 * 2. Clicks "Analyze Dream"
 * 3. Shows real-time progress: Analyzing → Generating Image → Done
 * 4. On complete, calls onComplete with the analysis and image
 *
 * @example
 * <DreamCapture
 *   initialText={transcribedText}
 *   onComplete={(result, text) => saveDream(text, result.analysis, result.image)}
 *   onCancel={() => navigate('home')}
 * />
 */
export default function DreamCapture({
  initialText = '',
  onComplete,
  onCancel,
  autoStart = false,
}: DreamCaptureProps) {
  const [text, setText] = useState(initialText);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([
    { name: 'Dream Analysis', status: 'pending', message: '' },
    { name: 'Image Generation', status: 'pending', message: '' },
  ]);
  const [analysisResult, setAnalysisResult] = useState<DreamAnalysis | null>(null);
  const [imageResult, setImageResult] = useState<DreamAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateStep = useCallback((name: string, update: { status?: StepStatus; message?: string }) => {
    setSteps(prev => prev.map(s => s.name === name ? { ...s, ...update } : s));
  }, []);

  const runPipeline = useCallback(async () => {
    if (!text.trim() || text.trim().length < 10) {
      setError('Please write at least a few words about your dream before analyzing.');
      return;
    }

    setError(null);
    setIsRunning(true);
    setAnalysisResult(null);
    setImageResult(null);

    // Reset steps
    setSteps([
      { name: 'Dream Analysis', status: 'running', message: 'Identifying themes, symbols, and emotions...' },
      { name: 'Image Generation', status: 'pending', message: '' },
    ]);

    // Step 1: AI Analysis
    let analysis: DreamAnalysis;
    try {
      analysis = await analyzeDream(text.trim());
      setAnalysisResult(analysis);
      updateStep('Dream Analysis', { status: 'done', message: `Category: ${analysis.category}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      updateStep('Dream Analysis', { status: 'error', message: msg });
      setError(msg);
      setIsRunning(false);
      return;
    }

    // Step 2: Image Generation
    updateStep('Image Generation', { status: 'running', message: 'Creating your dream visualization...' });
    let generatedImage: DreamAsset | null = null;
    try {
      const imagePrompt = analysis.narrative || analysis.nugget || text;
      generatedImage = await generateDreamImage(imagePrompt);
      setImageResult(generatedImage);
      updateStep('Image Generation', { status: 'done', message: `Image ready (${generatedImage.source})` });
    } catch (err) {
      // Image generation is non-critical — continue without it
      updateStep('Image Generation', { status: 'error', message: 'Image generation skipped (non-critical)' });
    }

    setIsRunning(false);
    onComplete({ analysis, image: generatedImage }, text.trim());
  }, [text, onComplete, updateStep]);

  // Auto-start if enabled and text is provided
  React.useEffect(() => {
    if (autoStart && text.trim().length >= 10 && !isRunning) {
      runPipeline();
    }
  }, [autoStart, text, isRunning, runPipeline]);

  const isComplete = steps.every(s => s.status === 'done' || s.status === 'error' || s.status === 'skipped');

  return (
    <div className="space-y-5">
      {/* Dream Input */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Type size={16} className="text-sage" />
          <h3 className="text-sm font-semibold text-ink">Your Dream</h3>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="I was walking through a forest when suddenly..."
          disabled={isRunning}
          className="w-full min-h-[160px] bg-parchment border border-line rounded-2xl p-4 text-ink placeholder:text-muted/60 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-sage/40 resize-none disabled:opacity-50"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted">{text.length} characters</span>
          {text.length >= 50 && (
            <span className="text-xs text-sage font-medium">✓ Ready for analysis</span>
          )}
        </div>
      </Card>

      {/* Pipeline Progress */}
      {isRunning && (
        <PipelineProgress
          steps={steps}
          title="Processing your dream..."
        />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      )}

      {/* Results Preview */}
      {isComplete && analysisResult && !isRunning && (
        <Card className="border-sage/20 bg-sage/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-sage" />
            <h3 className="text-sm font-semibold text-sageDark">Analysis Complete</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-dusk" />
              <span className="text-muted">Category:</span>
              <span className="font-medium text-ink capitalize">{analysisResult.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-dusk" />
              <span className="text-muted">Themes:</span>
              <span className="font-medium text-ink">{analysisResult.themes.join(', ')}</span>
            </div>
            {imageResult && (
              <div className="flex items-center gap-2">
                <Image size={14} className="text-dusk" />
                <span className="text-muted">Image:</span>
                <span className="font-medium text-ink">Generated ✓</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          size="md"
          onClick={onCancel}
          disabled={isRunning}
          fullWidth
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={runPipeline}
          disabled={isRunning || text.trim().length < 10}
          loading={isRunning}
          icon={<Wand2 size={16} />}
          fullWidth
        >
          {isRunning ? 'Processing...' : isComplete ? 'Re-analyze' : 'Analyze Dream'}
        </Button>
      </div>
    </div>
  );
}
