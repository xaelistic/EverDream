import { describe, expect, it } from 'vitest';
import {
  deriveDreamPipelineStatus,
  missingPipelineSteps,
  pipelineNeedsWork,
  pipelineProgressSteps,
  rollupProcessingFields,
  type PipelineDreamLike,
} from './dreamPipelineStatus';

describe('dreamPipelineStatus', () => {
  it('skips audio and transcription for text dreams and flags missing analysis/image', () => {
    const status = deriveDreamPipelineStatus({
      captureMode: 'text',
      content: 'I was flying over a glass forest.',
      category: 'uncategorized',
      themes: ['imported'],
    });
    expect(status.audio_captured).toBe('skipped');
    expect(status.transcription).toBe('skipped');
    expect(status.analysis).toBe('pending');
    expect(status.image).toBe('pending');
    expect(missingPipelineSteps(status)).toEqual(['analysis', 'image']);
  });

  it('treats captured audio without a real transcript as incomplete', () => {
    const dream: PipelineDreamLike = {
      captureMode: 'audio',
      content: 'Processing your audio dream…',
      audioCapture: { path: 'user/audio-1.webm', mediaId: 'media-1' },
      mediaStoragePath: 'user/audio-1.webm',
      processingStatus: 'processing',
    };
    const status = deriveDreamPipelineStatus(dream);
    expect(status.audio_captured).toBe('done');
    expect(status.transcription).toBe('pending');
    expect(status.analysis).toBe('pending');
    expect(status.image).toBe('pending');
    expect(status.overall).toBe('partial');
    expect(pipelineNeedsWork(dream)).toBe(true);
  });

  it('marks transcription, analysis, and image done when artifacts exist', () => {
    const status = deriveDreamPipelineStatus({
      captureMode: 'audio',
      content: 'I walk through a glass forest at dawn.',
      narrative: 'You are walking through a forest of glass trees.',
      interpretation: { meaning: 'A search for clarity after a vivid night of sleep.' },
      category: 'adventure',
      themes: ['forest', 'light'],
      audioCapture: { path: 'user/audio-1.webm' },
      generatedImage: { url: 'https://cdn.example/dream.png', source: 'openrouter' },
    });
    expect(status.transcription).toBe('done');
    expect(status.analysis).toBe('done');
    expect(status.image).toBe('done');
    expect(status.overall).toBe('complete');
    expect(missingPipelineSteps(status)).toEqual([]);
    expect(rollupProcessingFields(status)).toEqual({
      processingStatus: 'complete',
      processingStep: 'complete',
    });
  });

  it('does not treat a video thumbnail as the generated dream image', () => {
    const status = deriveDreamPipelineStatus({
      captureMode: 'video',
      content: 'I was flying over mountains.',
      narrative: 'You fly above a range of moonlit mountains.',
      interpretation: { meaning: 'A lift in perspective after a long climb.' },
      category: 'adventure',
      themes: ['flight'],
      videoCapture: { path: 'user/video-1.webm', url: 'https://cdn.example/video.webm' },
      generatedImage: { url: 'data:image/jpeg;base64,thumb', source: 'video-capture' },
    });
    expect(status.audio_captured).toBe('done');
    expect(status.transcription).toBe('done');
    expect(status.analysis).toBe('done');
    expect(status.image).toBe('pending');
    expect(missingPipelineSteps(status)).toEqual(['image']);
  });

  it('maps progress steps for the status UI', () => {
    const steps = pipelineProgressSteps(
      deriveDreamPipelineStatus({
        captureMode: 'text',
        content: 'A quiet harbour at night.',
        narrative: 'You stand on a quiet harbour watching lanterns drift out to sea.',
        interpretation: { meaning: 'Letting thoughts leave without chasing them.' },
        category: 'peaceful',
        themes: ['water'],
      }),
    );
    expect(steps.map((s) => s.name)).toEqual([
      'Audio captured',
      'Transcription',
      'Dream analysis',
      'Image generation',
    ]);
    expect(steps.find((s) => s.name === 'Transcription')?.status).toBe('skipped');
    expect(steps.find((s) => s.name === 'Dream analysis')?.status).toBe('done');
    expect(steps.find((s) => s.name === 'Image generation')?.status).toBe('pending');
  });

  it('ignores sample dreams when deciding catch-up work', () => {
    expect(
      pipelineNeedsWork({
        isSample: true,
        captureMode: 'text',
        content: 'A sample dream',
      }),
    ).toBe(false);
  });
});
