/**
 * Stop any active camera/mic tracks and silence hidden media elements.
 * Call when leaving the record screen or after a capture finishes.
 */
export function stopCaptureMedia(): void {
  if (typeof document === 'undefined') return;

  document.querySelectorAll('video, audio').forEach((element) => {
    const media = element as HTMLMediaElement;
    try {
      media.pause();
      media.currentTime = 0;
      media.removeAttribute('src');
      media.load();
      if ('srcObject' in media) {
        (media as HTMLVideoElement).srcObject = null;
      }
    } catch {
      /* ignore */
    }
  });
}