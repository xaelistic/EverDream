/**
 * Persist favourite dream IDs (local-first).
 * Stored as a JSON string array under window.storage key `favouriteDreams`.
 */

const STORAGE_KEY = 'favouriteDreams';

export async function loadFavouriteIds(): Promise<string[]> {
  try {
    const stored = await window.storage?.get(STORAGE_KEY);
    if (!stored?.value) return [];
    const parsed = JSON.parse(stored.value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

export async function saveFavouriteIds(ids: string[]): Promise<void> {
  try {
    await window.storage?.set(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
  } catch (error) {
    console.warn('[favourites] Failed to save', error);
  }
}

export function toggleFavouriteId(ids: string[], dreamId: string): string[] {
  const set = new Set(ids);
  if (set.has(dreamId)) set.delete(dreamId);
  else set.add(dreamId);
  return [...set];
}
