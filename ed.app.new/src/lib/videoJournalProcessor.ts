/**
 * Video Journal Processor
 *
 * Shared pipeline for video dream entries:
 * 1. Transcribe audio (Whisper via Supabase edge function)
 * 2. Analyze dream (narrative, emotion, symbols)
 * 3. Generate dream visualization image
 * 4. Build a complete dream record with structured logging
 */

import { transcribeAudio as transcribeWithWhisper } from './transcriptionWhisper';
import { analyzeDream, type DreamAnalysis } from './dream-analyzer';
import { generateDreamImage } from '../modules/sleep/dreamAssetGenerator';
import { mediaStorageManager } from './mediaStorage';
import { trackEvent } from './analytics';
import type { EmotionCapture } from '../components/face/FacialEmotionDetector';

const PLACEHOLDER_TRANSCRIPT =
  'Video journal entry - watch the video for the full dream description.';

export interface VideoJournalInput {
  videoBlob: Blob;
  videoUrl?: string;
  thumbnail?: string;
  duration: number;
  mediaId?: string;
  capturedEmotion?: EmotionCapture | null;
  hasAudio?: boolean;
}

export interface VideoJournalDream {
  id: string;
  date: string;
  content: string;
  category: string;
  themes: string[];
  emotion: string;
  symbols: string[];
  narrative: string;
  nugget: string;
  interpretation: DreamAnalysis['interpretation'];
  captureMode: 'video';
  videoCapture: {
    url: string;
    capturedAt: string;
    duration: number;
    thumbnail?: string;
    mediaId?: string;
  };
  generatedImage: {
    url: string;
    prompt: string;
    style: string;
    generatedAt: string;
    source?: string;
  } | null;
  capturedEmotions: EmotionCapture | null;
  isSample: false;
}

export interface VideoJournalProcessResult {
  dream: VideoJournalDream;
  transcriptSource: 'whisper' | 'web-speech' | 'fallback' | 'none';
  transcriptLength: number;
  imageSource: string;
}

function logStage(stage: string, detail?: Record<string, unknown>) {
  console.log(`[VideoJournal] ${stage}`, detail ?? '');
  trackEvent('custom', `video_journal_${stage}`, detail, 'record');
}

function logError(stage: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[VideoJournal] ${stage} failed:`, message);
  trackEvent('error', `video_journal_${stage}_error`, { message }, 'record');
}

/** Prepare blob for Whisper — video/webm often needs an audio MIME hint */
function prepareAudioForTranscription(blob: Blob): Blob {
  if (!blob.type.startsWith('video/')) return blob;
  const audioType = blob.type.includes('webm') ? 'audio/webm' : 'audio/ogg';
  console.log(`[VideoJournal] Converting ${blob.type} → ${audioType} for transcription (${blob.size} bytes)`);
  return new Blob([blob], { type: audioType });
}

async function transcribeVideoJournal(
  videoBlob: Blob,
  onProgress?: (status: string) => void,
): Promise<{ text: string; source: VideoJournalProcessResult['transcriptSource'] }> {
  const audioBlob = prepareAudioForTranscription(videoBlob);

  try {
    const result = await transcribeWithWhisper(audioBlob, { onProgress, language: 'en' });
    if (result.text && result.text.length > 5 && result.source !== 'fallback') {
      return {
        text: result.text.trim(),
        source: result.source === 'hf-whisper' ? 'whisper' : 'web-speech',
      };
    }
    logStage('transcription_empty', { source: result.source, length: result.text?.length ?? 0 });
  } catch (error) {
    logError('transcription', error);
  }

  return { text: PLACEHOLDER_TRANSCRIPT, source: 'none' };
}

function mergeEmotionIntoAnalysis(
  analysis: DreamAnalysis,
  capturedEmotion?: EmotionCapture | null,
): { analysis: DreamAnalysis; emotion: string } {
  let emotion = analysis.emotion || 'neutral';

  if (capturedEmotion?.dominantEmotion) {
    emotion = capturedEmotion.dominantEmotion;
    const emoNote = ` (Facial expression during recording: ${capturedEmotion.dominantEmotion}, confidence ${Math.round((capturedEmotion.confidence || 0) * 100)}%)`;
    if (analysis.interpretation?.meaning) {
      analysis.interpretation.meaning += emoNote;
    }
    analysis.narrative = (analysis.narrative || '') + emoNote;
    logStage('emotion_merged', { emotion: capturedEmotion.dominantEmotion });
  }

  return { analysis, emotion };
}

async function resolveVideoUrl(
  input: VideoJournalInput,
): Promise<{ url: string; mediaId?: string }> {
  if (input.mediaId) {
    try {
      const media = await mediaStorageManager.getMedia(input.mediaId);
      if (media) {
        return { url: URL.createObjectURL(media.blob), mediaId: input.mediaId };
      }
    } catch (error) {
      logError('media_resolve', error);
    }
  }

  if (input.videoUrl) {
    return { url: input.videoUrl };
  }

  return { url: URL.createObjectURL(input.videoBlob) };
}

/**
 * Process a video journal recording into a full dream entry.
 */
export async function processVideoJournal(
  input: VideoJournalInput,
): Promise<VideoJournalProcessResult> {
  logStage('start', {
    blobSize: input.videoBlob.size,
    blobType: input.videoBlob.type,
    duration: input.duration,
    hasAudio: input.hasAudio ?? true,
    mediaId: input.mediaId,
  });

  // 1. Transcribe
  logStage('transcription_start');
  const { text: transcriptText, source: transcriptSource } = await transcribeVideoJournal(
    input.videoBlob,
    (status) => logStage('transcription_progress', { status }),
  );
  logStage('transcription_complete', { source: transcriptSource, length: transcriptText.length });

  // 2. Analyze
  let finalAnalysis: DreamAnalysis;
  try {
    logStage('analysis_start');
    finalAnalysis = await analyzeDream(transcriptText);
    logStage('analysis_complete', { narrativeLength: finalAnalysis.narrative?.length ?? 0 });
  } catch (error) {
    logError('analysis', error);
    finalAnalysis = {
      category: 'video-journal',
      themes: ['video', 'personal-recording'],
      emotion: 'neutral',
      symbols: [],
      narrative:
        transcriptText.length > 50
          ? transcriptText
          : 'The dreamer recorded a video description of their dream.',
      nugget: transcriptText.substring(0, 90) + (transcriptText.length > 90 ? '...' : ''),
      interpretation: {
        symbols: {},
        meaning: 'Personal video reflection captured immediately upon waking.',
        commonPattern: 'Video journals provide rich emotional context.',
      },
    };
  }

  const { analysis, emotion: finalEmotion } = mergeEmotionIntoAnalysis(
    finalAnalysis,
    input.capturedEmotion,
  );

  // 3. Generate dream image (not just thumbnail)
  let generatedImage: VideoJournalDream['generatedImage'] = null;
  let imageSource = 'none';
  const imagePrompt = analysis.narrative || analysis.nugget || transcriptText;

  try {
    logStage('image_gen_start', { promptLength: imagePrompt.length });
    const asset = await generateDreamImage(imagePrompt);
    generatedImage = {
      url: asset.url,
      prompt: asset.prompt,
      style: asset.style,
      generatedAt: asset.generatedAt,
      source: asset.source,
    };
    imageSource = asset.source || 'generated';
    logStage('image_gen_complete', { source: imageSource });
  } catch (error) {
    logError('image_gen', error);
    if (input.thumbnail) {
      generatedImage = {
        url: input.thumbnail,
        prompt: 'Video journal thumbnail (image gen failed)',
        style: 'photo',
        generatedAt: new Date().toISOString(),
        source: 'video-capture-fallback',
      };
      imageSource = 'thumbnail-fallback';
    }
  }

  // 4. Resolve persistent video URL
  const { url: persistentVideoUrl, mediaId } = await resolveVideoUrl(input);

  const dream: VideoJournalDream = {
    id: `dream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
    content: transcriptText,
    category: analysis.category,
    themes: analysis.themes,
    emotion: finalEmotion,
    symbols: analysis.symbols,
    narrative: analysis.narrative,
    nugget: analysis.nugget,
    interpretation: analysis.interpretation,
    captureMode: 'video',
    videoCapture: {
      url: persistentVideoUrl,
      capturedAt: new Date().toISOString(),
      duration: input.duration || 0,
      thumbnail: input.thumbnail,
      mediaId: mediaId || input.mediaId,
    },
    generatedImage,
    capturedEmotions: input.capturedEmotion || null,
    isSample: false,
  };

  logStage('complete', {
    dreamId: dream.id,
    transcriptSource,
    transcriptLength: transcriptText.length,
    imageSource,
    emotion: finalEmotion,
  });

  return {
    dream,
    transcriptSource,
    transcriptLength: transcriptText.length,
    imageSource,
  };
}