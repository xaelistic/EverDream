/** Clock and playhead math for a saved voice note. */

export interface PlaybackPosition {
  current: number;
  duration: number;
  ratio: number;
}

export function formatPlaybackClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const total = Math.floor(totalSeconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function playbackClockLabel(current: number, duration: number): string {
  const now = formatPlaybackClock(current);
  if (!Number.isFinite(duration) || duration <= 0) return now;
  return `${now} / ${formatPlaybackClock(duration)}`;
}

/** Fraction of the recording already played. Unknown length stays at the start. */
export function playbackRatio(currentTime: number, duration: number): number {
  if (!Number.isFinite(currentTime) || currentTime <= 0) return 0;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(1, currentTime / duration);
}

/**
 * Prefer the element duration. MediaRecorder files often report Infinity
 * until the browser finishes the file, so a stored length can fill that gap.
 */
export function resolvePlaybackDuration(elementDuration: number, knownDuration?: number | null): number {
  if (Number.isFinite(elementDuration) && elementDuration > 0) return elementDuration;
  if (knownDuration != null && Number.isFinite(knownDuration) && knownDuration > 0) return knownDuration;
  return 0;
}
