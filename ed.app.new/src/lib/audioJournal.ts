/**
 * Audio journal helpers — MIME, duration, stuck-entry detection,
 * blob resolution (IndexedDB / storage path / URL), and merge rules
 * so cloud sync does not drop a recording that is still processing.
 */

import { mediaStorageManager } from './mediaStorage';
import { persistUserMedia, signedMediaUrl } from './mediaPersist';

export type ProcessingStatus = 'processing' | 'complete' | 'failed';

export interface AudioCaptureRef {
  url?: string;
  path?: string;
  capturedAt?: string;
  duration?: number;
  mediaId?: string;
  fileName?: string;
}

export interface JournalMediaDream {
  id: string;
  content?: string;
  narrative?: string;
  nugget?: string;
  captureMode?: string;
  processingStatus?: ProcessingStatus | string;
  processingStep?: string;
  audioCapture?: AudioCaptureRef | null;
  videoCapture?: { url?: string; path?: string; duration?: number; mediaId?: string; thumbnail?: string } | null;
  mediaStoragePath?: string | null;
  generatedImage?: { url?: string } | null;
  [key: string]: unknown;
}

const STUCK_TEXT =
  /processing your|processing in progress|transcribing your recording|building your xael/i;

export function guessAudioMime(name: string, fallback = 'audio/webm'): string {
  const lower = (name || '').toLowerCase();
  if (lower.endsWith('.m4a') || lower.endsWith('.aac')) return 'audio/mp4';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg') || lower.endsWith('.opus')) return 'audio/ogg';
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.flac')) return 'audio/flac';
  return fallback;
}

export function isPlaceholderJournalText(text?: string | null): boolean {
  return STUCK_TEXT.test(String(text || '').trim());
}

export function isStuckJournalDream(dream: {
  processingStatus?: string;
  content?: string;
  narrative?: string;
  nugget?: string;
}): boolean {
  if (dream.processingStatus === 'processing' || dream.processingStatus === 'failed') return true;
  return (
    isPlaceholderJournalText(dream.content) ||
    isPlaceholderJournalText(dream.narrative) ||
    isPlaceholderJournalText(dream.nugget)
  );
}

export function journalHasPlayableAudio(dream: JournalMediaDream): boolean {
  const capture = dream.audioCapture;
  return Boolean(
    capture?.mediaId ||
      capture?.path ||
      dream.mediaStoragePath ||
      (capture?.url && !capture.url.startsWith('blob:')),
  );
}

export function journalHasPlayableVideo(dream: JournalMediaDream): boolean {
  const capture = dream.videoCapture;
  return Boolean(
    capture?.mediaId ||
      capture?.path ||
      dream.mediaStoragePath ||
      (capture?.url && !capture.url.startsWith('blob:')),
  );
}

/** Prefer the local copy when it still has media or a finished transcript. */
export function preferRicherDream<T extends JournalMediaDream>(local: T, remote: T): T {
  const localStuck = isStuckJournalDream(local);
  const remoteStuck = isStuckJournalDream(remote);

  if (!localStuck && remoteStuck) return local;
  if (localStuck && !remoteStuck) return remote;

  const localHasAudio = Boolean(local.audioCapture?.mediaId || local.audioCapture?.path || local.audioCapture?.url);
  const remoteHasAudio = Boolean(remote.audioCapture?.mediaId || remote.audioCapture?.path || remote.audioCapture?.url);
  if (localHasAudio && !remoteHasAudio) {
    return { ...remote, audioCapture: local.audioCapture, mediaStoragePath: local.mediaStoragePath || remote.mediaStoragePath };
  }

  const localHasVideo = Boolean(local.videoCapture?.mediaId || local.videoCapture?.path || local.videoCapture?.url);
  const remoteHasVideo = Boolean(remote.videoCapture?.mediaId || remote.videoCapture?.path || remote.videoCapture?.url);
  if (localHasVideo && !remoteHasVideo) {
    return { ...remote, videoCapture: local.videoCapture, mediaStoragePath: local.mediaStoragePath || remote.mediaStoragePath };
  }

  if (local.generatedImage?.url && !remote.generatedImage?.url) {
    return { ...remote, generatedImage: local.generatedImage };
  }

  return remote;
}

export function mergeJournalDreams<T extends JournalMediaDream>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const dream of local) {
    if (dream?.id) map.set(dream.id, dream);
  }
  for (const dream of remote) {
    if (!dream?.id) continue;
    const existing = map.get(dream.id);
    map.set(dream.id, existing ? preferRicherDream(existing, dream) : dream);
  }
  return Array.from(map.values()).sort((a, b) => {
    const da = String(a.date || a.createdAt || '');
    const db = String(b.date || b.createdAt || '');
    return db.localeCompare(da);
  });
}

export async function getAudioDurationSeconds(blob: Blob): Promise<number> {
  if (typeof Audio === 'undefined' || !blob || blob.size === 0) return 0;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    let done = false;
    const finish = (value: number) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.onerror = () => finish(0);
    setTimeout(() => finish(0), 4000);
    audio.src = url;
  });
}

export async function resolveJournalAudioBlob(input: {
  audioBlob?: Blob | null;
  audioUrl?: string | null;
  mediaId?: string | null;
  path?: string | null;
}): Promise<Blob> {
  if (input.audioBlob && input.audioBlob.size > 0) return input.audioBlob;

  if (input.mediaId) {
    try {
      const stored = await mediaStorageManager.getMedia(input.mediaId);
      if (stored?.blob && stored.blob.size > 0) return stored.blob;
    } catch {
      /* fall through */
    }
  }

  const path = input.path || null;
  if (path) {
    const signed = await signedMediaUrl(path);
    if (signed) {
      const response = await fetch(signed);
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) return blob;
      }
    }
  }

  const url = input.audioUrl || '';
  if (url && (url.startsWith('blob:') || url.startsWith('http') || url.startsWith('data:'))) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) return blob;
      }
    } catch {
      /* fall through */
    }
  }

  throw new Error('Audio file is missing or empty. Try .m4a, .mp3, .ogg, or .wav.');
}

export async function resolveJournalVideoBlob(input: {
  videoBlob?: Blob | null;
  videoUrl?: string | null;
  mediaId?: string | null;
  path?: string | null;
}): Promise<Blob> {
  if (input.videoBlob && input.videoBlob.size > 0) return input.videoBlob;

  if (input.mediaId) {
    try {
      const stored = await mediaStorageManager.getMedia(input.mediaId);
      if (stored?.blob && stored.blob.size > 0) return stored.blob;
    } catch {
      /* fall through */
    }
  }

  if (input.path) {
    const signed = await signedMediaUrl(input.path);
    if (signed) {
      const response = await fetch(signed);
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) return blob;
      }
    }
  }

  const url = input.videoUrl || '';
  if (url && (url.startsWith('blob:') || url.startsWith('http') || url.startsWith('data:'))) {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 0) return blob;
    }
  }

  throw new Error('Video recording is missing — cannot transcribe or generate an image.');
}

export async function persistResolvedAudio(opts: {
  blob: Blob;
  dreamId: string;
  existingPath?: string | null;
}): Promise<{ path: string; url: string } | null> {
  if (opts.existingPath) {
    const url = await signedMediaUrl(opts.existingPath);
    if (url) return { path: opts.existingPath, url };
  }
  return persistUserMedia({ blob: opts.blob, kind: 'audio', dreamId: opts.dreamId });
}
