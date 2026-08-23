/**
 * Map journal dreams onto the live public.dreams schema.
 *
 * The table is a hybrid of the original NFT row (uuid id, media_type,
 * narrative NOT NULL, themes <= 3) plus later journal columns.
 * Client ids like "dream-1755-abc" are invalid UUIDs and were rejected.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null): boolean {
  return Boolean(value && UUID_RE.test(value));
}

export function generateDreamId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const n = (Math.random() * 16) | 0;
    const v = ch === 'x' ? n : (n & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Stable UUID for a legacy string id so re-syncs update the same row. */
export function cloudIdForDream(localId: string): string {
  if (isUuid(localId)) return localId.toLowerCase();

  let hash = 0x811c9dc5;
  const input = `everdream:${localId}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = Math.abs(hash >>> 0).toString(16).padStart(8, '0');
  const extra = Array.from(localId)
    .reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0)
    .toString(16)
    .padStart(12, '0')
    .slice(-12);
  return `e5ed${hex.slice(0, 4)}-0000-5000-8000-${extra}`;
}

function mediaTypeFromCapture(mode?: string): 'text' | 'audio' | 'video' {
  if (mode === 'audio' || mode === 'video') return mode;
  return 'text';
}

function toValence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  // Journal valence is -1..1; DB smallint is -5..5.
  const scaled = Math.abs(n) <= 1 ? Math.round(n * 5) : Math.round(n);
  return Math.max(-5, Math.min(5, scaled));
}

function compactImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('data:')) return url.length > 4000 ? null : url;
  return url;
}

export interface JournalDreamLike {
  id: string;
  date?: string;
  content?: string;
  category?: string;
  themes?: string[];
  emotion?: string;
  symbols?: string[];
  narrative?: unknown;
  nugget?: unknown;
  interpretation?: unknown;
  moodValence?: number;
  captureMode?: string;
  generatedImage?: { url?: string; prompt?: string; style?: string; source?: string } | null;
  videoCapture?: unknown;
  audioCapture?: unknown;
  audioFile?: string | null;
  sourceAudio?: string | null;
  context?: unknown;
  sleepData?: unknown;
  isSample?: boolean;
  mediaStoragePath?: string | null;
  processingStatus?: string;
  processingStep?: string;
  title?: string;
}

export function toDreamsUpsertRow(dream: JournalDreamLike, profileId: string): Record<string, unknown> {
  const content = String(dream.content || '').trim();
  const narrative = String(
    (typeof dream.narrative === 'string' && dream.narrative.trim())
      || content
      || dream.nugget
      || 'Untitled dream',
  ).slice(0, 20000);
  const themes = (Array.isArray(dream.themes) ? dream.themes.map(String) : []).slice(0, 3);
  const imageUrl = compactImageUrl(dream.generatedImage?.url);

  return {
    id: cloudIdForDream(dream.id),
    user_id: profileId,
    timestamp: dream.date || new Date().toISOString(),
    media_type: mediaTypeFromCapture(dream.captureMode),
    narrative,
    content: content || narrative,
    transcript: content && !/processing your/i.test(content) ? content : null,
    media_storage_path:
      dream.mediaStoragePath
      || (dream.videoCapture as { path?: string } | undefined)?.path
      || (dream.audioCapture as { path?: string } | undefined)?.path
      || null,
    themes,
    valence: toValence(dream.moodValence),
    arousal: 0,
    category: dream.category || 'uncategorized',
    emotion: dream.emotion || 'neutral',
    symbols: Array.isArray(dream.symbols) ? dream.symbols.map(String).slice(0, 12) : [],
    nugget: typeof dream.nugget === 'string' ? dream.nugget.slice(0, 500) : null,
    interpretation: dream.interpretation || null,
    mood_valence: typeof dream.moodValence === 'number' ? dream.moodValence : null,
    capture_mode: mediaTypeFromCapture(dream.captureMode),
    generated_image_url: imageUrl,
    generated_image_prompt: dream.generatedImage?.prompt || null,
    generated_image_style: dream.generatedImage?.style || 'dreamlike',
    generated_image_source: dream.generatedImage?.source || null,
    visibility: 'private',
    privacy: 'private',
    is_sample: Boolean(dream.isSample),
    is_deleted: false,
    local_created_at: dream.date || new Date().toISOString(),
    local_updated_at: new Date().toISOString(),
    ai_metadata: {
      local_id: dream.id,
      video_capture: dream.videoCapture || null,
      audio_capture: dream.audioCapture || null,
      source_audio: dream.audioFile || dream.sourceAudio || null,
      context: dream.context || null,
      sleep_data: dream.sleepData || null,
      scenes: (dream as { scenes?: unknown }).scenes || null,
      storyboard: (dream as { storyboardImages?: unknown }).storyboardImages || null,
      has_inline_image: Boolean(dream.generatedImage?.url?.startsWith('data:')),
      processing_status: dream.processingStatus || null,
      processing_step: dream.processingStep || null,
      title: dream.title || null,
    },
  };
}

interface DreamsAiMetadata {
  local_id?: string;
  video_capture?: JournalDreamLike['videoCapture'];
  audio_capture?: JournalDreamLike['audioCapture'];
  source_audio?: string | null;
  context?: unknown;
  sleep_data?: unknown;
  scenes?: unknown;
  storyboard?: unknown;
  processing_status?: string | null;
  processing_step?: string | null;
  title?: string | null;
}

/** Hydrate a journal dream from a public.dreams row, including audio/video capture. */
export function fromDreamsRow(record: Record<string, unknown>): JournalDreamLike & {
  date: string;
  generatedImage: JournalDreamLike['generatedImage'];
} {
  const meta = (record.ai_metadata || {}) as DreamsAiMetadata;
  const content = String(record.content || '');
  const narrative = typeof record.narrative === 'string' ? record.narrative : content;
  const imageUrl = typeof record.generated_image_url === 'string' ? record.generated_image_url : null;

  return {
    id: meta.local_id || String(record.id || ''),
    date: String(record.local_created_at || record.timestamp || record.created_at || new Date().toISOString()),
    content,
    category: String(record.category || 'uncategorized'),
    themes: Array.isArray(record.themes) ? record.themes.map(String) : [],
    emotion: String(record.emotion || 'neutral'),
    symbols: Array.isArray(record.symbols) ? record.symbols.map(String) : [],
    narrative,
    nugget: typeof record.nugget === 'string' ? record.nugget : narrative.substring(0, 100),
    interpretation: record.interpretation || null,
    moodValence: typeof record.mood_valence === 'number' ? record.mood_valence : undefined,
    captureMode: String(record.capture_mode || record.media_type || 'text'),
    generatedImage: imageUrl
      ? {
          url: imageUrl,
          prompt: typeof record.generated_image_prompt === 'string' ? record.generated_image_prompt : undefined,
          style: typeof record.generated_image_style === 'string' ? record.generated_image_style : undefined,
          source: typeof record.generated_image_source === 'string' ? record.generated_image_source : undefined,
        }
      : null,
    videoCapture: meta.video_capture || null,
    audioCapture: meta.audio_capture || null,
    audioFile: meta.source_audio || null,
    sourceAudio: meta.source_audio || null,
    context: meta.context || record.context || null,
    sleepData: meta.sleep_data || null,
    isSample: Boolean(record.is_sample),
    mediaStoragePath: (typeof record.media_storage_path === 'string' && record.media_storage_path) || null,
    processingStatus: meta.processing_status || undefined,
    processingStep: meta.processing_step || undefined,
    title: meta.title || (typeof record.nugget === 'string' ? record.nugget : undefined),
  };
}
