/** Size a captured still so it matches the video the person sees.

A phone held upright often delivers a landscape camera buffer. Drawing that
buffer into a 16:9 box is why the thumbnail lies. If the device is portrait
and the buffer is landscape, the still is turned to stand up. A missing size
means no still — a play button, not a guessed landscape frame.
*/
export function thumbnailCanvasSize(
  videoWidth: number,
  videoHeight: number,
  devicePortrait: boolean,
): { width: number; height: number; rotateClockwise: boolean } | null {
  if (!videoWidth || !videoHeight || !Number.isFinite(videoWidth) || !Number.isFinite(videoHeight)) {
    return null;
  }
  const framePortrait = videoHeight > videoWidth;
  if (devicePortrait && !framePortrait) {
    return { width: videoHeight, height: videoWidth, rotateClockwise: true };
  }
  return { width: videoWidth, height: videoHeight, rotateClockwise: false };
}

export function cameraIdeal(devicePortrait: boolean): { width: { ideal: number }; height: { ideal: number } } {
  return devicePortrait
    ? { width: { ideal: 1080 }, height: { ideal: 1920 } }
    : { width: { ideal: 1920 }, height: { ideal: 1080 } };
}

/** A landscape still must not stand in for a portrait video. */
export function stillMatchesVideo(stillWidth: number, stillHeight: number, videoPortrait: boolean): boolean {
  if (!stillWidth || !stillHeight) return false;
  return (stillHeight > stillWidth) === videoPortrait;
}
