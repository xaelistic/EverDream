import { cleanDreamTranscript } from './cleanDreamTranscript';
import { classifyDreamLength, storyboardPanelCount } from './dreamLength';

export interface DreamScene {
  id: string;
  title: string;
  summary: string;
  prompt: string;
  caption?: string;
}

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

const PANEL_TITLES: Record<2 | 3, string[]> = {
  2: ['Opening', 'Turn'],
  3: ['Opening', 'Middle', 'Close'],
};

function sentencesOf(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function captionFrom(chunk: string): string {
  const cleaned = chunk.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 90) return cleaned;
  const cut = cleaned.slice(0, 87);
  const at = cut.lastIndexOf(' ');
  return `${(at > 40 ? cut.slice(0, at) : cut).trim()}…`;
}

function sceneFromChunk(chunk: string, index: number, titles: string[]): DreamScene {
  const text = chunk.replace(/\s+/g, ' ').trim();
  return {
    id: `scene-${index + 1}`,
    title: titles[index] || `Scene ${index + 1}`,
    summary: text.slice(0, 180),
    prompt: text.slice(0, 420),
    caption: captionFrom(text),
  };
}

/** Split a dream telling into exactly 2 or 3 comic panels. */
export function splitIntoPanels(text: string, count: 2 | 3): DreamScene[] {
  const source = cleanDreamTranscript(text || '').trim();
  if (!source) return [];
  const titles = PANEL_TITLES[count];
  const sentences = sentencesOf(source);
  const chunks: string[] = [];

  if (sentences.length >= count) {
    const size = Math.ceil(sentences.length / count);
    for (let i = 0; i < count; i++) {
      const part = sentences.slice(i * size, i === count - 1 ? sentences.length : (i + 1) * size).join(' ');
      if (part) chunks.push(part);
    }
  } else {
    const size = Math.ceil(source.length / count);
    for (let i = 0; i < count; i++) {
      const start = i * size;
      const end = i === count - 1 ? source.length : (i + 1) * size;
      const slice = source.slice(start, end).trim();
      if (slice) chunks.push(slice);
    }
  }

  while (chunks.length < count && chunks.length > 0) {
    chunks.push(chunks[chunks.length - 1]);
  }

  return chunks.slice(0, count).map((chunk, index) => sceneFromChunk(chunk, index, titles));
}

export function detectDreamScenes(text: string): DreamScene[] {
  const source = (text || '').trim();
  const panels = storyboardPanelCount(classifyDreamLength(source));
  if (!panels) return [];
  return splitIntoPanels(source, panels);
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
