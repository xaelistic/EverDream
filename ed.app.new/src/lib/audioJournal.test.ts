import { describe, expect, it } from 'vitest';
import {
  guessAudioMime,
  isPlaceholderJournalText,
  isStuckJournalDream,
  mergeJournalDreams,
  preferRicherDream,
  type JournalMediaDream,
} from './audioJournal';
import { fromDreamsRow, toDreamsUpsertRow } from './dreamsRecord';

describe('audio journal helpers', () => {
  it('guesses MIME types from voice-memo filenames', () => {
    expect(guessAudioMime('dream.m4a')).toBe('audio/mp4');
    expect(guessAudioMime('note.mp3')).toBe('audio/mpeg');
    expect(guessAudioMime('clip.ogg')).toBe('audio/ogg');
    expect(guessAudioMime('rec.webm')).toBe('audio/webm');
    expect(guessAudioMime('unknown.bin', 'audio/webm')).toBe('audio/webm');
  });

  it('treats processing stubs as stuck, including failed transcription', () => {
    expect(isStuckJournalDream({ processingStatus: 'processing' })).toBe(true);
    expect(isStuckJournalDream({ processingStatus: 'failed' })).toBe(true);
    expect(isStuckJournalDream({ processingStatus: 'complete', content: 'I was flying' })).toBe(false);
    expect(isStuckJournalDream({ content: 'Processing your audio dream…' })).toBe(true);
    expect(isStuckJournalDream({ narrative: 'Audio journal recording (processing in progress)' })).toBe(true);
    expect(isPlaceholderJournalText('Transcribing your recording…')).toBe(true);
  });

  it('keeps local audioCapture when cloud sync dropped it', () => {
    const local: JournalMediaDream = {
      id: 'dream-1',
      processingStatus: 'processing',
      content: 'Processing your audio dream…',
      audioCapture: { mediaId: 'media-1', path: 'user/audio-1.m4a' },
    };
    const remote: JournalMediaDream = {
      id: 'dream-1',
      processingStatus: 'processing',
      content: 'Processing your audio dream…',
    };
    const merged = preferRicherDream(local, remote);
    expect(merged.audioCapture?.mediaId).toBe('media-1');
    expect(merged.audioCapture?.path).toBe('user/audio-1.m4a');
  });

  it('prefers a finished local transcript over a remote stub', () => {
    const local: JournalMediaDream = {
      id: 'dream-1',
      processingStatus: 'complete',
      content: 'I walk through a glass forest.',
      audioCapture: { mediaId: 'media-1' },
    };
    const remote: JournalMediaDream = {
      id: 'dream-1',
      processingStatus: 'processing',
      content: 'Processing your audio dream…',
    };
    expect(preferRicherDream(local, remote).content).toContain('glass forest');
  });

  it('merges local and remote journal lists without dropping audio', () => {
    const merged = mergeJournalDreams(
      [
        {
          id: 'a',
          date: '2026-08-23T10:00:00.000Z',
          processingStatus: 'processing',
          audioCapture: { mediaId: 'm-a' },
        },
      ],
      [
        {
          id: 'a',
          date: '2026-08-23T10:00:00.000Z',
          processingStatus: 'processing',
          content: 'Processing your audio dream…',
        },
        {
          id: 'b',
          date: '2026-08-23T11:00:00.000Z',
          processingStatus: 'complete',
          content: 'A second dream',
        },
      ],
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((d) => d.id === 'a')?.audioCapture?.mediaId).toBe('m-a');
    expect(merged[0].id).toBe('b');
  });
});

describe('dreamsRecord audio hydrate', () => {
  it('round-trips audioCapture and processingStatus through ai_metadata', () => {
    const row = toDreamsUpsertRow(
      {
        id: '11111111-1111-4111-8111-111111111111',
        content: 'Processing your audio dream…',
        narrative: 'Audio journal recording (processing in progress)',
        captureMode: 'audio',
        processingStatus: 'processing',
        processingStep: 'transcribe',
        audioCapture: {
          path: 'user/audio-1.webm',
          duration: 42,
          mediaId: 'media-9',
          fileName: 'voice.m4a',
        },
        mediaStoragePath: 'user/audio-1.webm',
      },
      'profile-1',
    );

    const meta = row.ai_metadata as Record<string, unknown>;
    expect(meta.processing_status).toBe('processing');
    expect((meta.audio_capture as { mediaId: string }).mediaId).toBe('media-9');

    const hydrated = fromDreamsRow(row);
    const audio = hydrated.audioCapture as { path?: string; mediaId?: string } | null;
    expect(hydrated.captureMode).toBe('audio');
    expect(hydrated.processingStatus).toBe('processing');
    expect(audio?.path).toBe('user/audio-1.webm');
    expect(audio?.mediaId).toBe('media-9');
    expect(hydrated.mediaStoragePath).toBe('user/audio-1.webm');
    expect(hydrated.pipelineStatus?.audio_captured).toBe('done');
    expect(hydrated.pipelineStatus?.transcription).toBe('pending');
    expect(row.pipeline_status).toMatchObject({
      audio_captured: 'done',
      transcription: 'pending',
      image: 'pending',
    });
  });
});
