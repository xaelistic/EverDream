export function videoFrameStyle(width: number, height: number): { portrait: boolean; aspectRatio: string } {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) {
    return { portrait: false, aspectRatio: '16 / 9' };
  }
  return {
    portrait: height > width,
    aspectRatio: `${Math.round(width)} / ${Math.round(height)}`,
  };
}
