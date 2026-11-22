/** Prompts that fill gaps in the person's own telling. They are starters, not a rewrite. */
export const SCULPT_PROMPTS = [
  { id: 'time', label: 'Time of night', starter: 'It was ' },
  { id: 'place', label: 'The place', starter: 'I was in ' },
  { id: 'who', label: 'Who was there', starter: 'With me: ' },
  { id: 'look', label: 'How they looked', starter: 'They looked ' },
  { id: 'sound', label: 'How they sounded', starter: 'They sounded ' },
] as const;

export const RECORDING_ADVICE =
  'Say where it was, who was there, and how they looked and sounded.';

export function appendSculptStarter(draft: string, starter: string): string {
  const text = (draft || '').replace(/\s+$/, '');
  const piece = starter.trim();
  if (!piece) return text;
  if (text.toLowerCase().includes(piece.toLowerCase())) return text;
  if (!text) return starter;
  const gap = /[.!?…]$/.test(text) ? ' ' : '. ';
  return `${text}${gap}${starter}`;
}

export function normalizeLinkedDreamIds(value: unknown, selfId?: string): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim())
    .filter(Boolean);
  const unique = [...new Set(ids)];
  return selfId ? unique.filter((id) => id !== selfId) : unique;
}

export function toggleLinkedDreamId(
  current: string[] | undefined,
  targetId: string,
  selfId: string,
): string[] {
  const links = normalizeLinkedDreamIds(current, selfId);
  const target = targetId.trim();
  if (!target || target === selfId) return links;
  return links.includes(target) ? links.filter((id) => id !== target) : [...links, target];
}
