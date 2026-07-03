/**
 * Non-blocking dream processing — save a stub entry immediately,
 * run transcription / analysis / image generation in the background.
 */

import {
  processVideoJournal,
  processAudioJournal,
  processTextJournal,
  type VideoJournalInput,
  type AudioJournalInput,
} from './videoJournalProcessor';

export type DreamProcessingStatus = 'processing' | 'complete' | 'failed';

export interface ProcessingDreamStub {
  id: string;
  date: string;
  content: string;
  category: string;
  themes: string[];
  emotion: string;
  symbols: string[];
  narrative: string;
  nugget: string;
  interpretation: { symbols: Record<string, string>; meaning: string; commonPattern: string };
  captureMode: string;
  processingStatus: DreamProcessingStatus;
  isSample: false;
  [key: string]: unknown;
}

function newDreamId(): string {
  return `dream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const PROCESSING_NARRATIVE =
  'Building your XAEL — transcribing, analysing tone, and generating your dream image. You can keep browsing.';

export function createVideoStub(input: {
  videoUrl: string;
  thumbnail?: string;
  duration: number;
  mediaId?: string;
}): ProcessingDreamStub {
  const mins = Math.floor(input.duration / 60);
  const secs = (input.duration % 60).toString().padStart(2, '0');
  return {
    id: newDreamId(),
    date: new Date().toISOString(),
    content: 'Processing your video journal…',
    category: 'video-journal',
    themes: ['video', 'processing'],
    emotion: 'neutral',
    symbols: [],
    narrative: PROCESSING_NARRATIVE,
    nugget: `Video journal (${mins}:${secs})`,
    interpretation: {
      symbols: {},
      meaning: 'Your recording is saved — analysis is running in the background.',
      commonPattern: '',
    },
    captureMode: 'video',
    processingStatus: 'processing',
    videoCapture: {
      url: input.videoUrl,
      capturedAt: new Date().toISOString(),
      duration: input.duration,
      thumbnail: input.thumbnail,
      mediaId: input.mediaId,
    },
    generatedImage: input.thumbnail
      ? {
          url: input.thumbnail,
          prompt: 'Video thumbnail',
          style: 'photo',
          generatedAt: new Date().toISOString(),
          source: 'video-capture',
        }
      : null,
    isSample: false,
  };
}

export function createAudioStub(input: {
  audioUrl: string;
  duration: number;
  mediaId?: string;
}): ProcessingDreamStub {
  const mins = Math.floor(input.duration / 60);
  const secs = (input.duration % 60).toString().padStart(2, '0');
  return {
    id: newDreamId(),
    date: new Date().toISOString(),
    content: 'Processing your audio journal…',
    category: 'audio-journal',
    themes: ['audio', 'processing'],
    emotion: 'neutral',
    symbols: [],
    narrative: PROCESSING_NARRATIVE,
    nugget: `Audio journal (${mins}:${secs})`,
    interpretation: {
      symbols: {},
      meaning: 'Your recording is saved — transcription and analysis are running in the background.',
      commonPattern: '',
    },
    captureMode: 'audio',
    processingStatus: 'processing',
    audioCapture: {
      url: input.audioUrl,
      capturedAt: new Date().toISOString(),
      duration: input.duration,
      mediaId: input.mediaId,
    },
    isSample: false,
  };
}

export function createTextStub(text: string, fileName?: string): ProcessingDreamStub {
  const preview = text.trim().substring(0, 90) + (text.length > 90 ? '…' : '');
  return {
    id: newDreamId(),
    date: new Date().toISOString(),
    content: text.trim(),
    category: 'processing',
    themes: [],
    emotion: 'neutral',
    symbols: [],
    narrative: PROCESSING_NARRATIVE,
    nugget: preview,
    interpretation: {
      symbols: {},
      meaning: 'Analysing themes and generating your dream image in the background.',
      commonPattern: '',
    },
    captureMode: 'text',
    processingStatus: 'processing',
    sourceFile: fileName,
    isSample: false,
  };
}

export async function runVideoProcessing(
  input: VideoJournalInput,
): Promise<Partial<ProcessingDreamStub>> {
  const { dream } = await processVideoJournal(input);
  return { ...dream, processingStatus: 'complete' };
}

export async function runAudioProcessing(
  input: AudioJournalInput,
): Promise<Partial<ProcessingDreamStub>> {
  const { dream } = await processAudioJournal(input);
  return { ...dream, processingStatus: 'complete' };
}

export async function runTextProcessing(text: string): Promise<Partial<ProcessingDreamStub>> {
  const { analysis, generatedImage } = await processTextJournal(text.trim());
  return {
    content: text.trim(),
    category: analysis.category,
    themes: analysis.themes,
    emotion: analysis.emotion,
    symbols: analysis.symbols,
    narrative: analysis.narrative,
    nugget: analysis.nugget,
    interpretation: analysis.interpretation,
    moodValence: analysis.valence,
    generatedImage,
    processingStatus: 'complete',
  };
}