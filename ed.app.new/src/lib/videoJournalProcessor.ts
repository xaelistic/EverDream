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
import { 
  loadCurrentUserProfile, 
  enrichAnalysisWithProfile, 
  enrichImagePromptWithProfile 
} from './userProfile';
import { mediaStorageManager } from './mediaStorage';
import { trackEvent } from './analytics';
import type { EmotionCapture } from '../components/face/FacialEmotionDetector';

const VIDEO_PLACEHOLDER =
  'Video journal entry - watch the video for the full dream description.';
const AUDIO_PLACEHOLDER =
  'Audio journal entry - listen to the recording for the full dream description.';
const PLACEHOLDER_TRANSCRIPT = VIDEO_PLACEHOLDER;

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

function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      resolve();
      return;
    }
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video for audio extraction'));
  });
}

function getSupportedAudioMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'audio/webm';
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function tryDecodeAudioExtraction(videoBlob: Blob): Promise<Blob | null> {
  try {
    const audioContext = new AudioContext();
    const arrayBuffer = await videoBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    await audioContext.close();
    const wav = audioBufferToWav(audioBuffer);
    console.log(`[VideoJournal] Decoded audio via Web Audio API (${wav.size} bytes)`);
    return wav;
  } catch {
    return null;
  }
}

async function tryCaptureStreamExtraction(
  video: HTMLVideoElement,
  sourceMimeType: string,
): Promise<Blob | null> {
  const captureStream =
    (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.() ??
    (video as HTMLVideoElement & { mozCaptureStream?: () => MediaStream }).mozCaptureStream?.();

  if (!captureStream) return null;

  const audioTracks = captureStream.getAudioTracks();
  if (audioTracks.length === 0) {
    console.warn('[VideoJournal] No audio tracks in video stream');
    return null;
  }

  const audioStream = new MediaStream(audioTracks);
  const mimeType = getSupportedAudioMimeType();
  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    const recorder = new MediaRecorder(audioStream, { mimeType, audioBitsPerSecond: 128000 });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onerror = () => reject(new Error('MediaRecorder failed during audio extraction'));

    recorder.onstop = () => {
      audioTracks.forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: mimeType });
      console.log(
        `[VideoJournal] Extracted audio via captureStream: ${sourceMimeType} ÔåÆ ${mimeType} (${blob.size} bytes)`,
      );
      resolve(blob.size > 0 ? blob : null);
    };

    recorder.start(250);

    video.currentTime = 0;
    video
      .play()
      .then(() => {
        const onEnded = () => {
          video.removeEventListener('ended', onEnded);
          if (recorder.state === 'recording') recorder.stop();
        };
        video.addEventListener('ended', onEnded);

        if (video.duration && isFinite(video.duration)) {
          setTimeout(() => {
            if (recorder.state === 'recording') recorder.stop();
          }, Math.ceil(video.duration * 1000) + 500);
        }
      })
      .catch(reject);
  });
}

/**
 * Extract the audio track from a video blob for Whisper transcription.
 * Uses captureStream + MediaRecorder, with Web Audio decode as fallback.
 */
async function extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
  if (!videoBlob.type.startsWith('video/')) return videoBlob;

  const videoUrl = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  try {
    await waitForVideoReady(video);

    const captured = await tryCaptureStreamExtraction(video, videoBlob.type);
    if (captured && captured.size > 1000) return captured;

    const decoded = await tryDecodeAudioExtraction(videoBlob);
    if (decoded && decoded.size > 1000) return decoded;

    throw new Error('Could not extract audio track from video');
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(videoUrl);
  }
}

async function transcribeVideoJournal(
  videoBlob: Blob,
  onProgress?: (status: string) => void,
): Promise<{ text: string; source: VideoJournalProcessResult['transcriptSource'] }> {
  onProgress?.('Extracting audio from video...');
  let audioBlob: Blob;
  try {
    audioBlob = await extractAudioFromVideo(videoBlob);
    logStage('audio_extracted', { size: audioBlob.size, type: audioBlob.type });
  } catch (error) {
    logError('audio_extraction', error);
    return { text: PLACEHOLDER_TRANSCRIPT, source: 'none' };
  }

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

    // Enrich with profile
    const profile = await loadCurrentUserProfile();
    finalAnalysis = enrichAnalysisWithProfile(finalAnalysis, profile);

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
    const p = await loadCurrentUserProfile();
    const enrichedPrompt = enrichImagePromptWithProfile(imagePrompt, p);
    const asset = await generateDreamImage(enrichedPrompt);
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

export interface AudioJournalInput {
  audioBlob: Blob;
  audioUrl?: string;
  duration: number;
  mediaId?: string;
}

export interface AudioJournalDream {
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
  captureMode: 'audio';
  audioCapture: {
    url: string;
    capturedAt: string;
    duration: number;
    mediaId?: string;
  };
  generatedImage: VideoJournalDream['generatedImage'];
  isSample: false;
}

export async function processAudioJournal(
  input: AudioJournalInput,
): Promise<{
  dream: AudioJournalDream;
  transcriptSource: VideoJournalProcessResult['transcriptSource'];
  transcriptLength: number;
  imageSource: string;
}> {
  const logPrefix = 'audio_journal';
  console.log(`[${logPrefix}] start`, { size: input.audioBlob.size, type: input.audioBlob.type });

  trackEvent('custom', `${logPrefix}_start`, {
    blobSize: input.audioBlob.size,
    duration: input.duration,
  }, 'record');

  const { text: transcriptText, source: transcriptSource } = await transcribeMediaBlob(
    input.audioBlob,
    AUDIO_PLACEHOLDER,
    logPrefix,
    (status) => console.log(`[${logPrefix}]`, status),
  );

  let finalAnalysis: DreamAnalysis;
  try {
    finalAnalysis = await analyzeDream(transcriptText);
  } catch (error) {
    logError('analysis', error);
    finalAnalysis = {
      category: 'audio-journal',
      themes: ['audio', 'voice-note', 'personal-recording'],
      emotion: 'neutral',
      symbols: [],
      narrative: transcriptText.length > 50 ? transcriptText : 'Voice journal of a dream description.',
      nugget: transcriptText.substring(0, 90) + (transcriptText.length > 90 ? '...' : ''),
      interpretation: {
        symbols: {},
        meaning: 'Personal voice reflection captured on waking.',
        commonPattern: 'Voice journals capture tone and immediacy.',
      },
    };
  }

  let generatedImage: AudioJournalDream['generatedImage'] = null;
  let imageSource = 'none';
  const imagePrompt = finalAnalysis.narrative || finalAnalysis.nugget || transcriptText;

  try {
    const p2 = await loadCurrentUserProfile();
    const ep2 = enrichImagePromptWithProfile(imagePrompt, p2);
    const asset = await generateDreamImage(ep2);
    generatedImage = {
      url: asset.url,
      prompt: asset.prompt,
      style: asset.style,
      generatedAt: asset.generatedAt,
      source: asset.source,
    };
    imageSource = asset.source || 'generated';
  } catch (error) {
    logError('image_gen', error);
  }

  let audioUrl = input.audioUrl;
  if (input.mediaId) {
    try {
      const media = await mediaStorageManager.getMedia(input.mediaId);
      if (media) audioUrl = URL.createObjectURL(media.blob);
    } catch { /* use provided url */ }
  }
  if (!audioUrl) audioUrl = URL.createObjectURL(input.audioBlob);

  const dream: AudioJournalDream = {
    id: `dream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
    content: transcriptText,
    category: finalAnalysis.category,
    themes: finalAnalysis.themes,
    emotion: finalAnalysis.emotion || 'neutral',
    symbols: finalAnalysis.symbols,
    narrative: finalAnalysis.narrative,
    nugget: finalAnalysis.nugget,
    interpretation: finalAnalysis.interpretation,
    captureMode: 'audio',
    audioCapture: {
      url: audioUrl,
      capturedAt: new Date().toISOString(),
      duration: input.duration || 0,
      mediaId: input.mediaId,
    },
    generatedImage,
    isSample: false,
  };

  trackEvent('custom', `${logPrefix}_complete`, {
    transcriptSource,
    transcriptLength: transcriptText.length,
    imageSource,
  }, 'record');

  return { dream, transcriptSource, transcriptLength: transcriptText.length, imageSource };
}

export async function processTextJournal(text: string): Promise<{
  analysis: DreamAnalysis;
  generatedImage: VideoJournalDream['generatedImage'];
}> {
  const trimmed = text.trim();
  const analysis = await analyzeDream(trimmed);
  let generatedImage: VideoJournalDream['generatedImage'] = null;
  try {
    const p3 = await loadCurrentUserProfile();
    const ep3 = enrichImagePromptWithProfile(analysis.narrative || analysis.nugget || trimmed, p3);
    const asset = await generateDreamImage(ep3);
    generatedImage = {
      url: asset.url,
      prompt: asset.prompt,
      style: asset.style,
      generatedAt: asset.generatedAt,
      source: asset.source,
    };
  } catch (error) {
    console.warn('[text_journal] image gen failed:', error);
  }
  return { analysis, generatedImage };
}
