/**
 * Daily session helpers — first-open routing, reflection card, today's dreams
 */

const OPEN_COUNT_KEY = 'ed_daily_open_count';
const OPEN_DATE_KEY = 'ed_daily_open_date';
const REFLECTION_DISMISSED_KEY = 'ed_reflection_dismissed_date';

export function getTodayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readStoredDate(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** How many times the app was opened today (before incrementing for current session) */
export function getTodayOpenCount(): number {
  const today = getTodayDateKey();
  const storedDate = readStoredDate(OPEN_DATE_KEY);
  if (storedDate !== today) return 0;
  try {
    return parseInt(localStorage.getItem(OPEN_COUNT_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function incrementTodayOpenCount(): void {
  const today = getTodayDateKey();
  const count = getTodayOpenCount() + 1;
  try {
    localStorage.setItem(OPEN_DATE_KEY, today);
    localStorage.setItem(OPEN_COUNT_KEY, String(count));
  } catch { /* ignore */ }
}

export function wasReflectionDismissedToday(): boolean {
  return readStoredDate(REFLECTION_DISMISSED_KEY) === getTodayDateKey();
}

export function dismissReflectionForToday(): void {
  try {
    localStorage.setItem(REFLECTION_DISMISSED_KEY, getTodayDateKey());
  } catch { /* ignore */ }
}

export function isDreamFromToday(dreamDateIso: string): boolean {
  const dreamDay = dreamDateIso.slice(0, 10);
  return dreamDay === getTodayDateKey();
}

export function hasDreamForToday(
  dreams: Array<{ date: string; isSample?: boolean }>,
): boolean {
  return dreams.some((d) => !d.isSample && isDreamFromToday(d.date));
}

/** Show full-screen reflection when returning or when today's journal exists */
export function shouldShowDailyReflection(
  dreams: Array<{ date: string; isSample?: boolean }>,
): boolean {
  if (wasReflectionDismissedToday()) return false;
  if (hasDreamForToday(dreams)) return true;
  if (getTodayOpenCount() >= 1) return true;
  return false;
}

/** First open today with no reflection trigger → land on journal */
export function shouldRouteToJournalOnOpen(
  dreams: Array<{ date: string; isSample?: boolean }>,
): boolean {
  if (shouldShowDailyReflection(dreams)) return false;
  return getTodayOpenCount() === 0;
}