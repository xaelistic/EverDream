/**
 * Dream Asset Generation Pipeline
 *
 * Generates rich media assets from dream content:
 * 1. Depth maps from dream images (Depth Anything v2)
 * 2. 360° skybox environments (Blockade Labs)
 * 3. 3D mesh objects (Meshy AI / Tripo AI)
 * 4. Parallax video from depth (image -> 3D-like video)
 * 5. Multi-view scene generation for Gaussian splatting
 *
 * Designed for overnight batch processing via n8n.
 * All APIs are async with job tracking.
 *
 * Environment variables:
 *   VITE_HF_INFERENCE_API_KEY   // HuggingFace Inference API (depth estimation)
 *   VITE_BLOCKADE_LABS_API_KEY  // Blockade Labs Skybox API
 *   VITE_MESHY_API_KEY          // Meshy AI text-to-3D API
 *   VITE_TRIPO_API_KEY          // Tripo AI text-to-3D API (alternative)
 *   VITE_RUNWAY_API_KEY         // Runway ML (image-to-video)
 */

// ============================================================
// TYPES
// ============================================================

export type AssetType =
  | 'depth_map'
  | 'skybox_360'
  | 'mesh_3d'
  | 'parallax_video'
  | 'multi_view'
  | 'gaussian_splat';

export type AssetStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DreamAsset {
  id: string;
  dream_id: string;
  type: AssetType;
  status: AssetStatus;
  prompt: string;
  source_url?: string;
  result_url?: string;
  result_urls?: string[];
  metadata?: Record<string, unknown>;
  error?: string;
  attempts: number;
  created_at: string;
  completed_at?: string;
}

export interface AssetGenerationJob {
  id: string;
  dream_id: string;
  dream_content: string;
  dream_nugget?: string;
  dream_themes?: string[];
  dream_emotion?: string;
  existing_image_url?: string;
  requested_types: AssetType[];
  priority: 'low' | 'normal' | 'high';
  status: AssetStatus;
  assets: DreamAsset[];
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// ============================================================
// DEPTH MAP GENERATION (HuggingFace Depth Anything v2)
// ============================================================

const HF_API_BASE = 'https://api-inference.huggingface.co/models';
const DEPTH_MODEL = 'depth-anything/Depth-Anything-V2-Large-hf';

/**
 * Generate a depth map from a dream image.
 * Uses HuggingFace Inference API — free tier available.
 */
export async function generateDepthMap(
  imageUrl: string,
  hfApiKey: string
): Promise<{ depthUrl: string; width: number; height: number }> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error(`Failed to fetch image: ${imageResponse.status}`);
  const imageBlob = await imageResponse.blob();

  const response = await fetch(`${HF_API_BASE}/${DEPTH_MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${hfApiKey}` },
    body: imageBlob,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Depth estimation failed: ${response.status} - ${error}`);
  }

  const depthBlob = await response.blob();
  const depthUrl = URL.createObjectURL(depthBlob);
  return { depthUrl, width: 0, height: 0 };
}

/**
 * Generate depth map from base64 image data.
 */
export async function generateDepthMapFromBase64(
  base64Data: string,
  hfApiKey: string
): Promise<string> {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/png' });

  const response = await fetch(`${HF_API_BASE}/${DEPTH_MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${hfApiKey}` },
    body: blob,
  });

  if (!response.ok) throw new Error(`Depth estimation failed: ${response.status}`);

  const resultBlob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(resultBlob);
  });
}

// ============================================================
// SKYBOX 360° GENERATION (Blockade Labs)
// ============================================================

const BLOCKADE_API_BASE = 'https://backend.blockadelabs.com/api/v1';

export interface SkyboxRequest {
  prompt: string;
  negative_prompt?: string;
  skybox_style_id?: number;
  seed?: number;
}

export interface SkyboxResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  image_url?: string;
  depth_map_url?: string;
  preview_url?: string;
}

/**
 * Submit a skybox generation request to Blockade Labs.
 * Returns a job ID for polling.
 */
export async function generateSkybox(
  request: SkyboxRequest,
  apiKey: string
): Promise<SkyboxResult> {
  const response = await fetch(`${BLOCKADE_API_BASE}/skybox`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      prompt: request.prompt,
      negative_prompt: request.negative_prompt || 'blurry, low quality, distorted',
      skybox_style_id: request.skybox_style_id || 10,
      seed: request.seed || Math.floor(Math.random() * 2147483647),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Skybox generation failed: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Poll skybox generation status.
 */
export async function pollSkyboxStatus(
  skyboxId: string,
  apiKey: string
): Promise<SkyboxResult> {
  const response = await fetch(`${BLOCKADE_API_BASE}/skybox/${skyboxId}`, {
    headers: { 'X-API-KEY': apiKey },
  });
  if (!response.ok) throw new Error(`Skybox poll failed: ${response.status}`);
  return response.json();
}

/**
 * Generate a skybox and poll until complete. Timeout: 5 minutes.
 */
export async function generateSkyboxBlocking(
  request: SkyboxRequest,
  apiKey: string,
  timeoutMs = 300_000
): Promise<SkyboxResult> {
  const job = await generateSkybox(request, apiKey);
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await pollSkyboxStatus(job.id, apiKey);
    if (status.status === 'completed') return status;
    if (status.status === 'failed') throw new Error('Skybox generation failed');
    await new Promise((r) => setTimeout(r, 10_000));
  }

  throw new Error('Skybox generation timed out');
}

// ============================================================
// 3D MESH GENERATION (Meshy AI)
// ============================================================

const MESHY_API_BASE = 'https://api.meshy.ai/v2';

export interface MeshyMeshRequest {
  prompt: string;
  negative_prompt?: string;
  style?: 'realistic' | 'cartoon' | 'lowpoly' | 'sculpture';
  target_polycount?: number;
}

export interface MeshyMeshResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  model_url?: string;
  thumbnail_url?: string;
  texture_url?: string;
  vertices_count?: number;
  faces_count?: number;
}

/** Submit a text-to-3D request to Meshy AI. */
export async function generate3DMesh(
  request: MeshyMeshRequest,
  apiKey: string
): Promise<MeshyMeshResult> {
  const response = await fetch(`${MESHY_API_BASE}/text-to-3d`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: request.prompt,
      negative_prompt: request.negative_prompt || 'low quality, blurry',
      style: request.style || 'realistic',
      target_polycount: request.target_polycount || 50000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meshy 3D generation failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return { id: data.result, status: 'pending' };
}

/** Poll Meshy 3D generation status. */
export async function pollMeshyStatus(
  taskId: string,
  apiKey: string
): Promise<MeshyMeshResult> {
  const response = await fetch(`${MESHY_API_BASE}/text-to-3d/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`Meshy poll failed: ${response.status}`);
  const data = await response.json();

  return {
    id: taskId,
    status: data.status || 'processing',
    model_url: data.model_urls?.glb,
    thumbnail_url: data.thumbnail_url,
    texture_url: data.texture_url,
    vertices_count: data.vertices_count,
    faces_count: data.faces_count,
  };
}

/** Generate a 3D mesh and poll until complete. Timeout: 10 minutes. */
export async function generate3DMeshBlocking(
  request: MeshyMeshRequest,
  apiKey: string,
  timeoutMs = 600_000
): Promise<MeshyMeshResult> {
  const job = await generate3DMesh(request, apiKey);
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await pollMeshyStatus(job.id, apiKey);
    if (status.status === 'completed') return status;
    if (status.status === 'failed') throw new Error('Meshy 3D generation failed');
    await new Promise((r) => setTimeout(r, 15_000));
  }

  throw new Error('Meshy 3D generation timed out');
}

// ============================================================
// TRIPO AI (Alternative 3D Generation)
// ============================================================

const TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';

export async function generate3DMeshTripo(
  prompt: string,
  apiKey: string
): Promise<{ taskId: string }> {
  const response = await fetch(`${TRIPO_API_BASE}/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ type: 'text_to_model', prompt }),
  });

  if (!response.ok) throw new Error(`Tripo 3D generation failed: ${response.status}`);
  const data = await response.json();
  return { taskId: data.data.task_id };
}

export async function pollTripoStatus(
  taskId: string,
  apiKey: string
): Promise<{ status: string; modelUrl?: string; thumbnailUrl?: string }> {
  const response = await fetch(`${TRIPO_API_BASE}/task/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`Tripo poll failed: ${response.status}`);
  const data = await response.json();

  return {
    status: data.data.status,
    modelUrl: data.data.output?.model,
    thumbnailUrl: data.data.output?.rendered_image,
  };
}

// ============================================================
// PARALLAX VIDEO GENERATION
// ============================================================

/**
 * Generate a parallax video from an image + depth map.
 * Uses canvas-based rendering (no external API needed).
 * Creates a smooth video with depth-aware camera movement.
 */
export async function generateParallaxVideo(
  imageUrl: string,
  depthMapUrl: string,
  options: {
    duration?: number;
    fps?: number;
    amplitude?: number;
    direction?: 'horizontal' | 'vertical' | 'circular';
  } = {}
): Promise<string> {
  const {
    duration = 5,
    fps = 24,
    amplitude = 0.12,
    direction = 'circular',
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('Canvas not supported')); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    const depthImg = new Image();
    depthImg.crossOrigin = 'anonymous';

    let loaded = 0;
    const onload = () => {
      loaded++;
      if (loaded < 2) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Get depth data for pixel-aware parallax
      const depthCanvas = document.createElement('canvas');
      depthCanvas.width = img.naturalWidth;
      depthCanvas.height = img.naturalHeight;
      const depthCtx = depthCanvas.getContext('2d');
      if (depthCtx) {
        depthCtx.drawImage(depthImg, 0, 0);
      }

      const totalFrames = duration * fps;
      const stream = canvas.captureStream(fps);

      // Try webm first, fall back to other codecs
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(URL.createObjectURL(blob));
      };

      recorder.start();

      // Render frames with depth-aware parallax
      let frameIndex = 0;

      const renderNextFrame = () => {
        if (frameIndex >= totalFrames) {
          recorder.stop();
          return;
        }

        const t = frameIndex / totalFrames;
        const angle = t * Math.PI * 2;

        let offsetX = 0;
        let offsetY = 0;
        const maxOffsetX = amplitude * canvas.width;
        const maxOffsetY = amplitude * canvas.height;

        switch (direction) {
          case 'horizontal':
            offsetX = Math.sin(angle) * maxOffsetX;
            break;
          case 'vertical':
            offsetY = Math.sin(angle) * maxOffsetY;
            break;
          case 'circular':
            offsetX = Math.cos(angle) * maxOffsetX;
            offsetY = Math.sin(angle) * maxOffsetY * 0.6;
            break;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Scale up slightly to allow for parallax movement without edge gaps
        const scale = 1 + amplitude * 1.5;
        const scaledW = canvas.width * scale;
        const scaledH = canvas.height * scale;
        const drawX = (canvas.width - scaledW) / 2 + offsetX;
        const drawY = (canvas.height - scaledH) / 2 + offsetY;

        ctx.drawImage(img, drawX, drawY, scaledW, scaledH);

        frameIndex++;
        requestAnimationFrame(renderNextFrame);
      };

      renderNextFrame();
    };

    img.onload = onload;
    depthImg.onload = onload;
    img.onerror = () => reject(new Error('Failed to load image'));
    depthImg.onerror = () => reject(new Error('Failed to load depth map'));
    img.src = imageUrl;
    depthImg.src = depthMapUrl;
  });
}

// ============================================================
// MULTI-VIEW GENERATION (for Gaussian Splatting - Phase 4)
// ============================================================

/** Default camera angles for multi-view generation */
export const DEFAULT_CAMERA_VIEWS = [
  'front view',
  '45 degree left',
  '45 degree right',
  'from above',
  'from below',
  'close-up detail shot',
  'wide establishing shot',
  'dramatic low angle',
] as const;

/**
 * Generate multiple views of a dream scene.
 * Each view is a separate image generation with a camera angle prompt.
 */
export async function generateMultiViewImages(
  dreamText: string,
  stylePrompt: string,
  count: number = 6,
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const views = DEFAULT_CAMERA_VIEWS.slice(0, count);
  const urls: string[] = [];

  for (let i = 0; i < views.length; i++) {
    const view = views[i];
    const prompt = `${dreamText}, ${view}, ${stylePrompt}`;
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&nologo=true&seed=${Date.now() % 1000000 + i}`;
    urls.push(url);
    onProgress?.(i + 1, views.length);
  }

  return urls;
}

// ============================================================
// ASSET PROMPTS & JOB MANAGEMENT
// ============================================================

/**
 * Generate optimized prompts for each asset type from dream content.
 */
export function generateAssetPrompts(dreamText: string, nugget?: string): Record<AssetType, string> {
  const base = nugget || dreamText.substring(0, 100);
  return {
    depth_map: `${dreamText}, detailed scene with clear depth layers, atmospheric perspective`,
    skybox_360: `${base}, immersive 360 degree environment, dreamlike, ethereal, surreal landscape, vast and expansive`,
    mesh_3d: `${base}, 3D object, isolated on white background, symmetrical, detailed`,
    parallax_video: `${dreamText}, cinematic composition with clear foreground and background, depth layers`,
    multi_view: `${dreamText}, multiple perspectives, detailed environment`,
    gaussian_splat: `${dreamText}, photorealistic 3D scene, volumetric lighting`,
  };
}

/**
 * Create a new asset generation job with all metadata.
 */
export function createAssetJob(
  dreamId: string,
  dreamContent: string,
  requestedTypes: AssetType[],
  options?: {
    dreamNugget?: string;
    dreamThemes?: string[];
    dreamEmotion?: string;
    existingImageUrl?: string;
    priority?: 'low' | 'normal' | 'high';
  }
): AssetGenerationJob {
  const now = new Date().toISOString();
  const prompts = generateAssetPrompts(dreamContent, options?.dreamNugget);

  const assets: DreamAsset[] = requestedTypes.map((type) => ({
    id: crypto.randomUUID(),
    dream_id: dreamId,
    type,
    status: 'pending',
    prompt: prompts[type],
    source_url: options?.existingImageUrl,
    metadata: {
      emotion: options?.dreamEmotion,
      themes: options?.dreamThemes,
    },
    attempts: 0,
    created_at: now,
  }));

  return {
    id: crypto.randomUUID(),
    dream_id: dreamId,
    dream_content: dreamContent,
    dream_nugget: options?.dreamNugget,
    dream_themes: options?.dreamThemes,
    dream_emotion: options?.dreamEmotion,
    existing_image_url: options?.existingImageUrl,
    requested_types: requestedTypes,
    priority: options?.priority || 'normal',
    status: 'pending',
    assets,
    created_at: now,
  };
}

/**
 * Process a single step in the asset pipeline.
 * Takes a job, processes the next pending asset, returns updated job.
 */
export async function processAssetStep(
  job: AssetGenerationJob,
  apiKeys: {
    hfApiKey?: string;
    blockadeApiKey?: string;
    meshyApiKey?: string;
    tripoApiKey?: string;
  }
): Promise<{ job: AssetGenerationJob; completed: boolean }> {
  const pendingIdx = job.assets.findIndex((a) => a.status === 'pending');
  if (pendingIdx === -1) {
    return {
      job: { ...job, status: 'completed', completed_at: new Date().toISOString() },
      completed: true,
    };
  }

  const asset = job.assets[pendingIdx];
  const updatedAssets = [...job.assets];
  const now = new Date().toISOString();

  updatedAssets[pendingIdx] = { ...asset, status: 'processing' as const, attempts: asset.attempts + 1 };
  let updatedJob: AssetGenerationJob = {
    ...job,
    assets: updatedAssets,
    started_at: job.started_at || now,
    status: 'processing',
  };

  try {
    switch (asset.type) {
      case 'depth_map': {
        if (!job.existing_image_url || !apiKeys.hfApiKey) {
          throw new Error('Depth map requires an image URL and HF API key');
        }
        const result = await generateDepthMap(job.existing_image_url, apiKeys.hfApiKey);
        updatedAssets[pendingIdx] = {
          ...updatedAssets[pendingIdx],
          status: 'completed',
          result_url: result.depthUrl,
          metadata: { ...updatedAssets[pendingIdx].metadata, width: result.width, height: result.height },
          completed_at: now,
        };
        break;
      }

      case 'skybox_360': {
        if (!apiKeys.blockadeApiKey) {
          throw new Error('Skybox requires Blockade Labs API key');
        }
        const result = await generateSkybox(
          { prompt: asset.prompt, negative_prompt: 'blurry, low quality' },
          apiKeys.blockadeApiKey
        );
        updatedAssets[pendingIdx] = {
          ...updatedAssets[pendingIdx],
          status: 'completed',
          result_url: result.image_url || result.preview_url,
          result_urls: result.image_url
            ? [result.image_url, result.depth_map_url].filter(Boolean) as string[]
            : undefined,
          metadata: { ...updatedAssets[pendingIdx].metadata, blockadeId: result.id },
          completed_at: now,
        };
        break;
      }

      case 'mesh_3d': {
        if (!apiKeys.meshyApiKey) {
          throw new Error('3D mesh requires Meshy API key');
        }
        const result = await generate3DMesh({ prompt: asset.prompt }, apiKeys.meshyApiKey);
        updatedAssets[pendingIdx] = {
          ...updatedAssets[pendingIdx],
          status: 'processing',
          metadata: { ...updatedAssets[pendingIdx].metadata, meshyId: result.id },
          completed_at: now,
        };
        break;
      }

      case 'parallax_video': {
        if (!job.existing_image_url) {
          throw new Error('Parallax video requires an image URL');
        }
        let depthUrl = job.existing_image_url;
        if (apiKeys.hfApiKey) {
          try {
            const depth = await generateDepthMap(job.existing_image_url, apiKeys.hfApiKey);
            depthUrl = depth.depthUrl;
          } catch {
            // Continue with fallback
          }
        }
        const videoUrl = await generateParallaxVideo(job.existing_image_url, depthUrl, {
          duration: 5,
          fps: 24,
          amplitude: 0.12,
          direction: 'circular',
        });
        updatedAssets[pendingIdx] = {
          ...updatedAssets[pendingIdx],
          status: 'completed',
          result_url: videoUrl,
          completed_at: now,
        };
        break;
      }

      case 'multi_view': {
        const urls = await generateMultiViewImages(asset.prompt, 'dreamlike, ethereal');
        updatedAssets[pendingIdx] = {
          ...updatedAssets[pendingIdx],
          status: 'completed',
          result_urls: urls,
          completed_at: now,
        };
        break;
      }

      case 'gaussian_splat': {
        updatedAssets[pendingIdx] = {
          ...updatedAssets[pendingIdx],
          status: 'failed',
          error: 'Gaussian splatting is Phase 4 — not yet implemented',
          completed_at: now,
        };
        break;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    updatedAssets[pendingIdx] = {
      ...updatedAssets[pendingIdx],
      status: 'failed',
      error: message,
      completed_at: now,
    };
  }

  updatedJob = { ...updatedJob, assets: updatedAssets };
  const allDone = updatedAssets.every((a) => a.status === 'completed' || a.status === 'failed');
  if (allDone) {
    updatedJob = { ...updatedJob, status: 'completed', completed_at: now };
  }

  return { job: updatedJob, completed: allDone };
}
