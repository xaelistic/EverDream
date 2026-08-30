/**
 * Flag whether a dream is short, medium, or long enough for a storyboard/clip.
 * Medium = 2 comic panels. Long = 3. Short = still image only.
 */

export type DreamNarrativeLength = 'short' | 'medium' | 'long';

const SCENE_CUE =
  /(?:^|[.!?]\s+)(then|suddenly|later|next|after that|afterwards|meanwhile|eventually|the scene (?:changed|shifted)|i (?:found|was suddenly|ended up))/gi;

export function wordCount(text: string): number {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function classifyDreamLength(text: string): DreamNarrativeLength {
  const words = wordCount(text);
  const cues = String(text || '').match(SCENE_CUE)?.length ?? 0;
  if (words >= 220 || cues >= 3) return 'long';
  if (words >= 90 || cues >= 1) return 'medium';
  return 'short';
}

export function storyboardPanelCount(length: DreamNarrativeLength): 0 | 2 | 3 {
  if (length === 'medium') return 2;
  if (length === 'long') return 3;
  return 0;
}

export function storyboardSupportsVideo(length: DreamNarrativeLength): boolean {
  return length === 'medium' || length === 'long';
}

export function clipDurationSeconds(length: DreamNarrativeLength): number {
  return length === 'long' ? 8 : 6;
}

export function normalizeNarrativeLength(value: unknown): DreamNarrativeLength | null {
  if (value === 'short' || value === 'medium' || value === 'long') return value;
  return null;
}
