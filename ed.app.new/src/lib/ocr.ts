import * as Tesseract from 'tesseract.js';

export interface OcrResult {
  photoId: string;
  text: string;
  confidence: number;
}

/**
 * Preprocess an image for better OCR results.
 * Applies contrast enhancement, sharpening, and binarization
 * via an offscreen canvas before passing to Tesseract.
 */
export function preprocessImage(
  imageSource: string | File | HTMLImageElement,
  options: {
    contrast?: number;    // 0-200, default 150
    brightness?: number;  // 0-200, default 100
    grayscale?: boolean;  // default true
    threshold?: number;   // 0-255, default 128 (binarize)
  } = {},
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const {
      contrast = 150,
      brightness = 100,
      grayscale = true,
      threshold = 0, // 0 = no binarization
    } = options;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const cleanup = () => {
      if (imageSource instanceof File) {
        URL.revokeObjectURL(img.src);
      }
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { cleanup(); reject(new Error('Canvas not supported')); return; }

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Grayscale
        if (grayscale) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = g = b = gray;
        }

        // Contrast
        r = ((r / 255 - 0.5) * (contrast / 100) + 0.5) * 255;
        g = ((g / 255 - 0.5) * (contrast / 100) + 0.5) * 255;
        b = ((b / 255 - 0.5) * (contrast / 100) + 0.5) * 255;

        // Brightness
        r *= brightness / 100;
        g *= brightness / 100;
        b *= brightness / 100;

        // Binarization (optional)
        if (threshold > 0) {
          const avg = (r + g + b) / 3;
          const val = avg >= threshold ? 255 : 0;
          r = g = b = val;
        }

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imageData, 0, 0);
      cleanup();
      resolve(canvas);
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image for preprocessing'));
    };

    if (imageSource instanceof File) {
      img.src = URL.createObjectURL(imageSource);
    } else if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = imageSource.src;
    }
  });
}

/**
 * Extract text from a single image using Tesseract.js.
 * Accepts data URLs, blob URLs, File objects, or canvas elements.
 * Optionally preprocesses the image first for better results.
 */
export async function extractTextFromImage(
  imageSource: string | File | HTMLCanvasElement | HTMLImageElement,
  onProgress?: (progress: number) => void,
  preprocess = true,
): Promise<OcrResult> {
  let source = imageSource;

  // Preprocess if it's a File or URL (not already a canvas)
  if (preprocess && !(imageSource instanceof HTMLCanvasElement)) {
    try {
      const canvas = await preprocessImage(imageSource, {
        contrast: 160,
        brightness: 105,
        grayscale: true,
        threshold: 0, // soft contrast, no hard binarize
      });
      source = canvas;
    } catch {
      // Fall back to original source if preprocessing fails
      source = imageSource;
    }
  }

  const result = await Tesseract.recognize(source, 'eng', {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  return {
    photoId: typeof imageSource === 'string'
      ? imageSource.slice(0, 40)
      : imageSource instanceof File
        ? imageSource.name
        : 'image',
    text: result.data.text.trim(),
    confidence: result.data.confidence,
  };
}

/**
 * Process multiple images sequentially, returning results in order.
 */
export async function extractTextFromMultipleImages(
  images: { id: string; source: string | File }[],
  onPhotoProgress?: (photoId: string, progress: number) => void,
  onPhotoComplete?: (photoId: string, result: OcrResult) => void,
): Promise<OcrResult[]> {
  const results: OcrResult[] = [];

  for (const image of images) {
    try {
      const result = await extractTextFromImage(
        image.source,
        (p) => onPhotoProgress?.(image.id, p),
        true, // enable preprocessing
      );
      results.push({ ...result, photoId: image.id });
      onPhotoComplete?.(image.id, result);
    } catch (error) {
      console.error(`OCR failed for photo ${image.id}:`, error);
      const failResult: OcrResult = {
        photoId: image.id,
        text: '',
        confidence: 0,
      };
      results.push(failResult);
      onPhotoComplete?.(image.id, failResult);
    }
  }

  return results;
}
