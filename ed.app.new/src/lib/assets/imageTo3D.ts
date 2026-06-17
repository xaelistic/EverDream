/**
 * Image → 3D mesh pipeline (Meshy image-to-3D + local depth fallback).
 * Works without API keys via luminance-based depth maps for browser simulacra.
 */

import { generateDepthMap, pollMeshyStatus } from './pipeline';

const MESHY_IMAGE_API = 'https://api.meshy.ai/v2/image-to-3d';

export interface ImageTo3DJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  modelUrl?: string;
  thumbnailUrl?: string;
  source: 'meshy' | 'local_depth';
  error?: string;
}

/** Submit dream image to Meshy image-to-3D. */
export async function submitImageTo3D(
  imageUrl: string,
  apiKey: string,
  options?: { style?: string },
): Promise<ImageTo3DJob> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error(`Failed to fetch image: ${imageResponse.status}`);
  const imageBlob = await imageResponse.blob();
  const base64 = await blobToBase64(imageBlob);

  const response = await fetch(MESHY_IMAGE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      image_url: base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`,
      enable_pbr: true,
      style: options?.style ?? 'realistic',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Meshy image-to-3D failed: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return { id: data.result, status: 'pending', source: 'meshy' };
}

/** Poll Meshy image-to-3D until complete. */
export async function pollImageTo3D(
  taskId: string,
  apiKey: string,
  timeoutMs = 600_000,
): Promise<ImageTo3DJob> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await pollMeshyStatus(taskId, apiKey);
    if (status.status === 'completed') {
      return {
        id: taskId,
        status: 'completed',
        modelUrl: status.model_url,
        thumbnailUrl: status.thumbnail_url,
        source: 'meshy',
      };
    }
    if (status.status === 'failed') {
      return { id: taskId, status: 'failed', source: 'meshy', error: 'Meshy job failed' };
    }
    await new Promise((r) => setTimeout(r, 12_000));
  }
  return { id: taskId, status: 'failed', source: 'meshy', error: 'Timed out' };
}

/** Full image→GLB pipeline when Meshy key is available. */
export async function imageTo3DBlocking(
  imageUrl: string,
  meshyApiKey: string,
): Promise<ImageTo3DJob> {
  const job = await submitImageTo3D(imageUrl, meshyApiKey);
  return pollImageTo3D(job.id, meshyApiKey);
}

/**
 * Local fallback: depth map from HuggingFace or luminance heuristic.
 * No 3D API required — powers browser displacement simulacra.
 */
export async function buildLocalDepthMap(
  imageUrl: string,
  hfApiKey?: string,
): Promise<string> {
  if (hfApiKey) {
    try {
      const { depthUrl } = await generateDepthMap(imageUrl, hfApiKey);
      return depthUrl;
    } catch (e) {
      console.warn('[imageTo3D] HF depth failed, using luminance fallback', e);
    }
  }
  return generateLuminanceDepthMap(imageUrl);
}

/** Canvas luminance → grayscale depth (always available offline). */
export async function generateLuminanceDepthMap(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 512;
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.floor(img.naturalWidth * scale);
      canvas.height = Math.floor(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unsupported'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = lum;
      }
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob(
        (blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('Depth blob failed'))),
        'image/png',
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for depth'));
    img.src = imageUrl;
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}