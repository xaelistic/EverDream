import {
  isStuckJournalDream,
  persistResolvedAudio,
  resolveJournalAudioBlob,
  resolveJournalVideoBlob,
  type JournalMediaDream,
} from './audioJournal';
import { persistUserMedia } from './mediaPersist';
import { processAudioJournal, processVideoJournal } from './videoJournalProcessor';

const inFlight = new Set<string>();

export { isStuckJournalDream };

export async function reprocessStuckMediaDream(
  dream: JournalMediaDream,
): Promise<JournalMediaDream | null> {
  if (!isStuckJournalDream(dream)) return null;
  if (inFlight.has(dream.id)) return null;
  inFlight.add(dream.id);

  try {
    const isVideo = dream.captureMode === 'video' || Boolean(dream.videoCapture);
    const isAudio = dream.captureMode === 'audio' || Boolean(dream.audioCapture);

    if (isVideo) {
      const videoBlob = await resolveJournalVideoBlob({
        videoUrl: dream.videoCapture?.url,
        mediaId: dream.videoCapture?.mediaId,
        path: dream.videoCapture?.path || dream.mediaStoragePath,
      });
      const uploaded = await persistUserMedia({ blob: videoBlob, kind: 'video', dreamId: dream.id });
      const { dream: processed } = await processVideoJournal({
        videoBlob,
        videoUrl: uploaded?.url || dream.videoCapture?.url,
        duration: dream.videoCapture?.duration || 0,
        mediaId: dream.videoCapture?.mediaId,
        path: uploaded?.path || dream.videoCapture?.path || dream.mediaStoragePath || undefined,
        thumbnail: dream.videoCapture?.thumbnail,
      });
      return {
        ...dream,
        ...processed,
        id: dream.id,
        videoCapture: {
          ...processed.videoCapture,
          url: uploaded?.url || processed.videoCapture.url,
          path: uploaded?.path || dream.videoCapture?.path,
          mediaId: dream.videoCapture?.mediaId,
        },
        mediaStoragePath: uploaded?.path || dream.mediaStoragePath,
        processingStatus: 'complete',
        processingStep: 'complete',
      };
    }

    if (isAudio) {
      const audioBlob = await resolveJournalAudioBlob({
        audioUrl: dream.audioCapture?.url,
        mediaId: dream.audioCapture?.mediaId,
        path: dream.audioCapture?.path || dream.mediaStoragePath,
      });
      const uploaded = await persistResolvedAudio({
        blob: audioBlob,
        dreamId: dream.id,
        existingPath: dream.audioCapture?.path || dream.mediaStoragePath,
      });
      const { dream: processed } = await processAudioJournal({
        audioBlob,
        audioUrl: uploaded?.url || dream.audioCapture?.url,
        duration: dream.audioCapture?.duration || 0,
        mediaId: dream.audioCapture?.mediaId,
        path: uploaded?.path || dream.audioCapture?.path || dream.mediaStoragePath || undefined,
        fileName: dream.audioCapture?.fileName,
      });
      return {
        ...dream,
        ...processed,
        id: dream.id,
        audioCapture: {
          ...processed.audioCapture,
          url: uploaded?.url || processed.audioCapture.url,
          path: uploaded?.path || dream.audioCapture?.path,
          mediaId: dream.audioCapture?.mediaId,
          fileName: dream.audioCapture?.fileName,
        },
        mediaStoragePath: uploaded?.path || dream.mediaStoragePath,
        processingStatus: 'complete',
        processingStep: 'complete',
      };
    }

    return null;
  } finally {
    inFlight.delete(dream.id);
  }
}
