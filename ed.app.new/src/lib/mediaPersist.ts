import { supabase, getCurrentUser } from './supabase/client';

const BUCKET = 'dream-media';
const SIGNED_TTL_SECONDS = 60 * 60 * 24 * 30;

function extensionFor(blob: Blob, kind: 'video' | 'audio' | 'image'): string {
  const type = (blob.type || '').toLowerCase();
  if (type.includes('mp4')) return kind === 'audio' ? 'm4a' : 'mp4';
  if (type.includes('quicktime')) return 'mov';
  if (type.includes('webm')) return kind === 'audio' ? 'webm' : 'webm';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('wav')) return 'wav';
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  return kind === 'image' ? 'png' : kind === 'audio' ? 'webm' : 'webm';
}

export async function persistUserMedia(opts: {
  blob: Blob;
  kind: 'video' | 'audio' | 'image';
  dreamId?: string;
}): Promise<{ path: string; url: string } | null> {
  const user = await getCurrentUser();
  if (!user || !opts.blob || opts.blob.size === 0) return null;

  const ext = extensionFor(opts.blob, opts.kind);
  const path = `${user.id}/${opts.kind}-${opts.dreamId || Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, opts.blob, {
    contentType: opts.blob.type || `${opts.kind}/*`,
    upsert: true,
  });
  if (error) {
    console.warn('[mediaPersist] upload failed:', error.message);
    return null;
  }

  const url = await signedMediaUrl(path);
  return { path, url: url || '' };
}

export async function persistDataOrBlobUrl(
  source: string,
  kind: 'video' | 'audio' | 'image',
  dreamId?: string,
): Promise<{ path: string; url: string } | null> {
  if (source.startsWith('https://') && !source.includes('blob:')) {
    return { path: '', url: source };
  }
  if (!source.startsWith('blob:') && !source.startsWith('data:')) return null;
  try {
    const response = await fetch(source);
    const blob = await response.blob();
    return persistUserMedia({ blob, kind, dreamId });
  } catch (err) {
    console.warn('[mediaPersist] fetch source failed:', err);
    return null;
  }
}

export async function signedMediaUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.warn('[mediaPersist] signed URL failed:', error?.message);
    return null;
  }
  return data.signedUrl;
}
