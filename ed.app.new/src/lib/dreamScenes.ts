import { cleanDreamTranscript } from './cleanDreamTranscript';

export interface DreamScene {
  id: string;
  title: string;
  summary: string;
  prompt: string;
}

const SCENE_CUE =
  /(?:^|[.!?]\s+)(then|suddenly|later|next|after that|afterwards|meanwhile|eventually|the scene (?:changed|shifted)|i (?:found|was suddenly|ended up))/i;

export function formatTranscriptParagraphs(text: string): string {
  const cleaned = cleanDreamTranscript(text).replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  if (!cleaned) return '';

  if (/\n\s*\n/.test(cleaned)) {
    return cleaned
      .split(/\n\s*\n/)
      .map((part) => part.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n\n');
  }

  const sentences = cleaned
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 2) return cleaned;

  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(' '));
  }
  return paragraphs.join('\n\n');
}

export function detectDreamScenes(text: string): DreamScene[] {
  const source = (text || '').trim();
  if (source.length < 80) return [];

  const paragraphs = formatTranscriptParagraphs(source)
    .split(/\n\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);

  let chunks = paragraphs;
  if (chunks.length < 2) {
    const parts = source.split(SCENE_CUE).map((p) => p.trim()).filter((p) => p.length > 40);
    if (parts.length >= 2) chunks = parts;
  }

  if (chunks.length < 2 && source.length > 500) {
    const mid = Math.floor(source.length / 2);
    const split = source.lastIndexOf('. ', mid);
    const at = split > 80 ? split + 1 : mid;
    chunks = [source.slice(0, at).trim(), source.slice(at).trim()].filter((p) => p.length > 40);
  }

  if (chunks.length < 2) return [];

  return chunks.slice(0, 6).map((chunk, index) => ({
    id: `scene-${index + 1}`,
    title: `Scene ${index + 1}`,
    summary: chunk.slice(0, 180),
    prompt: chunk.slice(0, 420),
  }));
}

export function analysisLooksPending(meaning?: string, category?: string, themes?: string[]): boolean {
  const text = (meaning || '').trim();
  if (!text) return true;
  if (/analysing your uploaded|analyzing your uploaded|analysis unavailable|processing your/i.test(text)) {
    return true;
  }
  if (/^(uncategorized|video-journal|audio-journal|processing)$/i.test(category || '')) {
    return true;
  }
  return category === 'uncategorized' && (themes?.length ?? 0) <= 1 && /imported/i.test(themes?.[0] || '');
}
