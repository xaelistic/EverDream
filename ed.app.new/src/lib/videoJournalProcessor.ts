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
import { detectDreamScenes, type DreamScene } from './dreamScenes';
import { classifyDreamLength, type DreamNarrativeLength } from './dreamLength';
import { normalizeCategory, normalizeEmotion, deriveDreamTitle } from './dreamClassify';
import { cleanDreamTranscript, dreamTellingFromTranscript } from './cleanDreamTranscript';
import { guessAudioMime, isPlaceholderJournalText, resolveJournalAudioBlob, resolveJournalVideoBlob } from './audioJournal';
import { whisperWavFromChannels } from './whisperAudio';

export type DreamProcessStep = 'transcribe' | 'analyse' | 'image' | 'complete';

export class PipelineStepError extends Error {
  readonly step: 'transcribe' | 'analyse' | 'image';
  readonly transcript: string | null;

  constructor(step: 'transcribe' | 'analyse' | 'image', message: string, transcript: string | null = null) {
    super(message);
    this.name = 'PipelineStepError';
    this.step = step;
    this.transcript = transcript;
  }
}

function usableTranscript(text: string): boolean {
  const value = text.trim();
  return value.length >= 10 && !isPlaceholderJournalText(value);
}
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
  videoBlob?: Blob;
  videoUrl?: string;
  thumbnail?: string;
  duration: number;
  mediaId?: string;
  path?: string;
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
  title: string;
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
  imageFailed?: boolean;
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

async function tryDecodeAudioExtraction(videoBlob: Blob): Promise<Blob | null> {
  try {
    const audioContext = new AudioContext();
    const arrayBuffer = await videoBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    await audioContext.close();
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      channels.push(audioBuffer.getChannelData(ch));
    }
    const wav = whisperWavFromChannels(channels, audioBuffer.sampleRate);
    console.log(`[VideoJournal] Decoded audio via Web Audio API (${wav.size} bytes, 16 kHz mono)`);
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
    const recorder = new MediaRecorder(audioStream, { mimeType, audioBitsPerSecond: 32000 });

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

    video.muted = true;
    video.volume = 0;
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

    const decoded = await tryDecodeAudioExtraction(videoBlob);
    if (decoded && decoded.size > 1000) return decoded;

    const captured = await tryCaptureStreamExtraction(video, videoBlob.type);
    if (captured && captured.size > 1000) return captured;

    throw new Error('Could not extract audio track from video');
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(videoUrl);
  }
}

async function transcribeMediaBlob(
  blob: Blob,
  placeholder: string,
  logPrefix: string,
  onProgress?: (status: string) => void,
  fileName?: string,
): Promise<{ text: string; source: VideoJournalProcessResult['transcriptSource'] }> {
  try {
    const typed = fileName && (!blob.type || blob.type === 'application/octet-stream')
      ? new File([blob], fileName, { type: guessAudioMime(fileName, blob.type || 'audio/webm') })
      : fileName
        ? new File([blob], fileName, { type: blob.type || guessAudioMime(fileName) })
        : blob;
    const result = await transcribeWithWhisper(typed, { onProgress, language: 'en' });
    if (result.text && result.text.length > 5 && result.source !== 'fallback') {
      return {
        text: dreamTellingFromTranscript(result.text),
        source: result.source === 'hf-whisper' ? 'whisper' : 'web-speech',
      };
    }
    console.warn(`[${logPrefix}] transcription empty`, { source: result.source, length: result.text?.length ?? 0 });
  } catch (error) {
    logError(`${logPrefix}_transcription`, error);
  }
  return { text: placeholder, source: 'none' };
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
        text: dreamTellingFromTranscript(result.text),
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
  onStep?: (step: DreamProcessStep) => void,
): Promise<VideoJournalProcessResult> {
  const videoBlob = await resolveJournalVideoBlob({
    videoBlob: input.videoBlob,
    videoUrl: input.videoUrl,
    mediaId: input.mediaId,
    path: input.path,
  });

  logStage('start', {
    blobSize: videoBlob.size,
    blobType: videoBlob.type,
    duration: input.duration,
    hasAudio: input.hasAudio ?? true,
    mediaId: input.mediaId,
  });

  // 1. Transcribe
  onStep?.('transcribe');
  logStage('transcription_start');
  const { text: transcriptText, source: transcriptSource } = await transcribeVideoJournal(
    videoBlob,
    (status) => logStage('transcription_progress', { status }),
  );
  logStage('transcription_complete', { source: transcriptSource, length: transcriptText.length });
  if (transcriptSource === 'none' || !usableTranscript(transcriptText)) {
    throw new PipelineStepError(
      'transcribe',
      'Could not transcribe that video. The recording is saved.',
    );
  }

  // 2. Analyze
  onStep?.('analyse');
  let finalAnalysis: DreamAnalysis;
  try {
    logStage('analysis_start');
    finalAnalysis = await analyzeDream(dreamTellingFromTranscript(transcriptText));

    // Enrich with profile
    const profile = await loadCurrentUserProfile();
    finalAnalysis = enrichAnalysisWithProfile(finalAnalysis, profile);

    logStage('analysis_complete', { narrativeLength: finalAnalysis.narrative?.length ?? 0 });
  } catch (error) {
    logError('analysis', error);
    throw new PipelineStepError(
      'analyse',
      'The transcript is saved. Analysis did not finish.',
      transcriptText,
    );
  }

  const { analysis, emotion: mergedFace } = mergeEmotionIntoAnalysis(
    finalAnalysis,
    input.capturedEmotion,
  );
  const finalEmotion = normalizeEmotion(mergedFace || analysis.emotion, {
    face: input.capturedEmotion?.dominantEmotion,
    text: transcriptText || analysis.narrative,
    valence: analysis.valence,
  });
  analysis.narrative = cleanDreamTranscript(analysis.narrative || '');
  analysis.category = normalizeCategory(analysis.category, transcriptText || analysis.narrative, analysis.valence);
  analysis.nugget = deriveDreamTitle(analysis.nugget, analysis.narrative || transcriptText);

  // 3. Generate dream image (not just thumbnail)
  onStep?.('image');
  let generatedImage: VideoJournalDream['generatedImage'] = null;
  let imageSource = 'none';
  let imageFailed = false;
  const telling = dreamTellingFromTranscript(transcriptText);
  const imagePrompt = telling || transcriptText;

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
    imageFailed = true;
  }

  // 4. Resolve persistent video URL
  const { url: persistentVideoUrl, mediaId } = await resolveVideoUrl(input);

  const dream: VideoJournalDream = {
    id: crypto.randomUUID?.() || `dream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
    content: telling,
    category: analysis.category,
    themes: analysis.themes,
    emotion: finalEmotion,
    symbols: analysis.symbols,
    narrative: analysis.narrative,
    nugget: analysis.nugget,
    title: deriveDreamTitle('', telling || transcriptText),
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
    imageFailed,
  };
}

export interface AudioJournalInput {
  audioBlob?: Blob;
  audioUrl?: string;
  duration: number;
  mediaId?: string;
  path?: string;
  fileName?: string;
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
  title: string;
  interpretation: DreamAnalysis['interpretation'];
  captureMode: 'audio';
  audioCapture: {
    url: string;
    capturedAt: string;
    duration: number;
    mediaId?: string;
    path?: string;
    fileName?: string;
  };
  generatedImage: VideoJournalDream['generatedImage'];
  isSample: false;
}

export async function processAudioJournal(
  input: AudioJournalInput,
  onStep?: (step: DreamProcessStep) => void,
): Promise<{
  dream: AudioJournalDream;
  transcriptSource: VideoJournalProcessResult['transcriptSource'];
  transcriptLength: number;
  imageSource: string;
  imageFailed?: boolean;
}> {
  const logPrefix = 'audio_journal';

  const audioBlob = await resolveJournalAudioBlob({
    audioBlob: input.audioBlob,
    audioUrl: input.audioUrl,
    mediaId: input.mediaId,
    path: input.path,
  });

  console.log(`[${logPrefix}] start`, { size: audioBlob.size, type: audioBlob.type, fileName: input.fileName });
  trackEvent('custom', `${logPrefix}_start`, {
    blobSize: audioBlob.size,
    duration: input.duration,
  }, 'record');

  onStep?.('transcribe');
  const { text: transcriptText, source: transcriptSource } = await transcribeMediaBlob(
    audioBlob,
    AUDIO_PLACEHOLDER,
    logPrefix,
    (status) => console.log(`[${logPrefix}]`, status),
    input.fileName,
  );

  if (transcriptSource === 'none' || !usableTranscript(transcriptText)) {
    throw new PipelineStepError(
      'transcribe',
      'Could not transcribe that audio. The recording is saved.',
    );
  }

  onStep?.('analyse');
  let finalAnalysis: DreamAnalysis;
  try {
    finalAnalysis = await analyzeDream(dreamTellingFromTranscript(transcriptText));
    finalAnalysis.narrative = cleanDreamTranscript(finalAnalysis.narrative || '');
    finalAnalysis.category = normalizeCategory(finalAnalysis.category, transcriptText, finalAnalysis.valence);
    finalAnalysis.emotion = normalizeEmotion(finalAnalysis.emotion, { text: transcriptText, valence: finalAnalysis.valence });
    finalAnalysis.nugget = deriveDreamTitle(finalAnalysis.nugget, finalAnalysis.narrative || transcriptText);
  } catch (error) {
    logError('analysis', error);
    throw new PipelineStepError(
      'analyse',
      'The transcript is saved. Analysis did not finish.',
      transcriptText,
    );
  }

  onStep?.('image');
  let generatedImage: AudioJournalDream['generatedImage'] = null;
  let imageSource = 'none';
  let imageFailed = false;
  const audioTelling = dreamTellingFromTranscript(transcriptText);
  const imagePrompt = audioTelling || transcriptText;

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
    imageFailed = true;
  }

  let audioUrl = input.audioUrl;
  if (input.mediaId) {
    try {
      const media = await mediaStorageManager.getMedia(input.mediaId);
      if (media) audioUrl = URL.createObjectURL(media.blob);
    } catch { /* use provided url */ }
  }
  if (!audioUrl) audioUrl = URL.createObjectURL(audioBlob);

  const dream: AudioJournalDream = {
    id: crypto.randomUUID?.() || `dream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
    content: audioTelling,
    category: finalAnalysis.category,
    themes: finalAnalysis.themes,
    emotion: finalAnalysis.emotion || 'wonder',
    symbols: finalAnalysis.symbols,
    narrative: finalAnalysis.narrative,
    nugget: finalAnalysis.nugget,
    title: deriveDreamTitle('', audioTelling || transcriptText),
    interpretation: finalAnalysis.interpretation,
    captureMode: 'audio',
    audioCapture: {
      url: audioUrl,
      capturedAt: new Date().toISOString(),
      duration: input.duration || 0,
      mediaId: input.mediaId,
      path: input.path,
      fileName: input.fileName,
    },
    generatedImage,
    isSample: false,
  };

  trackEvent('custom', `${logPrefix}_complete`, {
    transcriptSource,
    transcriptLength: transcriptText.length,
    imageSource,
  }, 'record');

  return { dream, transcriptSource, transcriptLength: transcriptText.length, imageSource, imageFailed };
}

export async function processTextJournal(
  text: string,
  onStep?: (step: DreamProcessStep) => void,
): Promise<{
  analysis: DreamAnalysis;
  generatedImage: VideoJournalDream['generatedImage'];
  scenes: DreamScene[];
  narrativeLength: DreamNarrativeLength;
  imageFailed?: boolean;
}> {
  const trimmed = text.trim();
  onStep?.('analyse');
  const analysis = await analyzeDream(trimmed);
  analysis.category = normalizeCategory(analysis.category, trimmed, analysis.valence);
  analysis.emotion = normalizeEmotion(analysis.emotion, { text: trimmed, valence: analysis.valence });
  analysis.nugget = deriveDreamTitle(analysis.nugget, analysis.narrative || trimmed);
  const source = trimmed;
  const narrativeLength = classifyDreamLength(source);
  const scenes = detectDreamScenes(source);
  onStep?.('image');
  let generatedImage: VideoJournalDream['generatedImage'] = null;
  try {
    const p3 = await loadCurrentUserProfile();
    const ep3 = enrichImagePromptWithProfile(trimmed, p3);
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
  return { analysis, generatedImage, scenes, narrativeLength, imageFailed: !generatedImage };
}
