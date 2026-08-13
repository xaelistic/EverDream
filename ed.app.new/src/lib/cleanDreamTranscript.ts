const SPEAKER_LINE = /^\s*(?:\[?\s*)?(?:speaker|spk)[\s_-]*\d+\s*\]?\s*[:.\-–—]?\s*/gim;
const SPEAKER_INLINE = /\b(?:speaker|spk)[\s_-]*\d+\b[:.\-–—]?\s*/gi;
const TIMESTAMP = /\[?\b\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\b\]?/g;

const FILLER_PHRASES = [
  /\b(?:um+|uh+|er+|ah+|hmm+|mm+|mhm+|uh-huh)\b[,.]?/gi,
  /\b(?:you know|i mean|kind of|sort of|basically)\b[,.]?/gi,
];

const RECORDING_SENTENCE =
  /[^.!?\n]*(?:\b(?:record(?:ing|ed)?|filming|video journal|audio journal|voice memo|transcript|transcrib(?:e|ing)|speaker\s*\d+|can you hear|testing testing|i(?:['’]m| am) (?:just )?(?:gonna |going to )?(?:tell you|talk about) my dream)\b)[^.!?\n]*[.!?]?/gi;

export function cleanDreamTranscript(raw: string): string {
  let text = (raw || '').replace(/\r\n/g, '\n');
  if (!text.trim()) return '';

  text = text.replace(SPEAKER_LINE, '');
  text = text.replace(SPEAKER_INLINE, '');
  text = text.replace(TIMESTAMP, '');
  text = text.replace(RECORDING_SENTENCE, ' ');

  for (const pattern of FILLER_PHRASES) {
    text = text.replace(pattern, ' ');
  }

  text = text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?]){2,}/g, '$1')
    .trim();

  if (!text) return '';

  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?…]$/.test(text)) text += '.';
  return text;
}

export function transcriptNeedsRewrite(text: string): boolean {
  const blob = (text || '').toLowerCase();
  if (!blob.trim()) return true;
  if (/\bspeaker[\s_-]*\d+\b/.test(blob)) return true;
  if (/\b(video journal|audio journal|recording my dream|i'?m recording)\b/.test(blob)) return true;
  return false;
}

/** Prefer a cleaned telling; fall back to the analysis narrative if the memo is still meta. */
export function dreamTellingFromTranscript(raw: string, narrative?: string): string {
  const cleaned = cleanDreamTranscript(raw);
  const story = (narrative || '').trim();
  if (transcriptNeedsRewrite(cleaned) && story && !transcriptNeedsRewrite(story)) {
    return cleanDreamTranscript(story);
  }
  return cleaned || cleanDreamTranscript(story);
}
