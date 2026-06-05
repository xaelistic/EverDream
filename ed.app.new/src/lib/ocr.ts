import * as Tesseract from 'tesseract.js';

export interface OcrResult {
  photoId: string;
  text: string;
  confidence: number;
}

/**
 * Upscale an image using canvas interpolation for better OCR on small text.
 * Uses bicubic-like scaling via canvas smooth scaling.
 */
function upscaleImage(
  img: HTMLImageElement,
  scale: number = 2,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = img.naturalWidth * scale;
  canvas.height = img.naturalHeight * scale;
  
  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Apply denoising to image data using a simple box blur filter.
 * Helps reduce salt-and-pepper noise that can confuse OCR.
 */
function applyDenoising(
  imageData: ImageData,
  strength: number = 1,
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(width, height);
  
  const halfKernel = strength;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const nx = Math.max(0, Math.min(width - 1, x + kx));
          const ny = Math.max(0, Math.min(height - 1, y + ky));
          const idx = (ny * width + nx) * 4;
          
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          count++;
        }
      }
      
      const idx = (y * width + x) * 4;
      output.data[idx] = r / count;
      output.data[idx + 1] = g / count;
      output.data[idx + 2] = b / count;
      output.data[idx + 3] = data[idx + 3];
    }
  }
  
  return output;
}

/**
 * Apply adaptive thresholding to image data.
 * Better than global thresholding for images with varying lighting.
 */
function applyAdaptiveThreshold(
  imageData: ImageData,
  blockSize: number = 15,
  c: number = 2,
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(width, height);
  const halfBlock = Math.floor(blockSize / 2);
  
  // Convert to grayscale first
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  
  // Apply adaptive threshold
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      
      for (let by = -halfBlock; by <= halfBlock; by++) {
        for (let bx = -halfBlock; bx <= halfBlock; bx++) {
          const nx = Math.max(0, Math.min(width - 1, x + bx));
          const ny = Math.max(0, Math.min(height - 1, y + by));
          sum += gray[ny * width + nx];
          count++;
        }
      }
      
      const mean = sum / count;
      const idx = (y * width + x) * 4;
      const val = gray[y * width + x] > (mean - c) ? 255 : 0;
      
      output.data[idx] = val;
      output.data[idx + 1] = val;
      output.data[idx + 2] = val;
      output.data[idx + 3] = 255;
    }
  }
  
  return output;
}

/**
 * Preprocess an image for better OCR results.
 * Applies upscaling, contrast enhancement, denoising, and adaptive binarization.
 */
export function preprocessImage(
  imageSource: string | File | HTMLImageElement,
  options: {
    contrast?: number;       // 0-200, default 150
    brightness?: number;     // 0-200, default 100
    grayscale?: boolean;     // default true
    upscale?: boolean;       // default true (2x scale)
    denoise?: boolean;       // default true
    adaptiveThreshold?: boolean; // default true
    threshold?: number;      // 0-255, for global threshold (0 = adaptive)
  } = {},
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const {
      contrast = 150,
      brightness = 100,
      grayscale = true,
      upscale: doUpscale = true,
      denoise = true,
      adaptiveThreshold = true,
      threshold = 0,
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

      // Upscale if needed
      let sourceCanvas: HTMLCanvasElement;
      if (doUpscale) {
        sourceCanvas = upscaleImage(img, 2);
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;
      } else {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        sourceCanvas = canvas;
      }
      
      const tempCtx = canvas.getContext('2d')!;
      if (doUpscale) {
        tempCtx.drawImage(sourceCanvas, 0, 0);
      } else {
        tempCtx.drawImage(img, 0, 0);
      }

      let imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Apply pixel-level adjustments
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

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      // Apply denoising
      if (denoise) {
        imageData = applyDenoising(imageData, 1);
      }

      // Apply thresholding
      if (adaptiveThreshold && threshold === 0) {
        imageData = applyAdaptiveThreshold(imageData, 15, 2);
      } else if (threshold > 0) {
        // Global threshold
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const val = avg >= threshold ? 255 : 0;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
      }

      tempCtx.putImageData(imageData, 0, 0);
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
 * Detect orientation of text in an image and correct it.
 * Returns the corrected canvas or the original if detection fails.
 */
export async function correctOrientation(
  imageSource: string | File | HTMLCanvasElement | HTMLImageElement,
): Promise<HTMLCanvasElement | null> {
  try {
    // Use Tesseract's OSD (orientation and script detection)
    const osdResult = await Tesseract.detect(imageSource);
    
    if (!osdResult || !osdResult.data) {
      return null;
    }

    const orientation = osdResult.data.orientation_degrees;
    
    // If no rotation needed, return null to indicate no correction
    if (orientation === 0) {
      return null;
    }

    // Load image into canvas for rotation
    let img: HTMLImageElement;
    if (imageSource instanceof HTMLCanvasElement) {
      img = new Image();
      img.src = imageSource.toDataURL();
    } else if (imageSource instanceof HTMLImageElement) {
      img = imageSource;
    } else if (imageSource instanceof File) {
      img = new Image();
      img.src = URL.createObjectURL(imageSource);
    } else {
      img = new Image();
      img.src = imageSource;
    }

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Rotate canvas based on detected orientation
    if (orientation === 90 || orientation === 270) {
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
    } else {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((orientation * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    // Cleanup if needed
    if (imageSource instanceof File) {
      URL.revokeObjectURL(img.src);
    }

    return canvas;
  } catch {
    return null;
  }
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
  autoCorrectOrientation = false,
): Promise<OcrResult> {
  let source: string | File | HTMLCanvasElement | HTMLImageElement = imageSource;

  // Auto-correct orientation if requested
  if (autoCorrectOrientation) {
    try {
      const corrected = await correctOrientation(imageSource);
      if (corrected) {
        source = corrected;
      }
    } catch {
      // Ignore orientation correction errors
    }
  }

  // Preprocess if it's a File or URL (not already a canvas)
  if (preprocess && !(source instanceof HTMLCanvasElement)) {
    try {
      const canvas = await preprocessImage(source, {
        contrast: 160,
        brightness: 105,
        grayscale: true,
        upscale: true,
        denoise: true,
        adaptiveThreshold: true,
        threshold: 0,
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
    tessedit_char_whitelist: '', // Allow all characters
    preserve_interword_spaces: '1',
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
        false, // auto orientation correction disabled by default
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
