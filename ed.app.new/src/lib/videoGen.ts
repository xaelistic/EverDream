/**
 * Dream Video & VR Generation
 * 
 * Uses free/cheap APIs for generating video and 3D content from dreams:
 * 
 * VIDEO GENERATION:
 * - Replicate.com (free tier credits, then pay-per-use)
 *   - Mochi Video: https://replicate.com/fofr/mochi
 *   - AnimateDiff: https://replicate.com/fofr/animatediff
 *   - Stable Video Diffusion: https://replicate.com/stability-ai/stable-video-diffusion
 * - Fal.ai (free tier)
 * - HuggingFace Inference API (free, public models)
 * 
 * 3D/VR GENERATION:
 * - Three.js + WebGL (client-side, free)
 * - Luma AI Genie (free tier)
 * - Stable Dreamfusion via Replicate
 * - Meshy.ai (free tier)
 * 
 * All generation is async - we submit a job and poll for results.
 */

export interface VideoGenerationJob {
  id: string;
  prompt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  provider: string;
  createdAt: string;
  completedAt?: string;
}

export interface VRGenerationJob {
  id: string;
  prompt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  modelUrl?: string;      // GLB/GLTF 3D model
  previewUrl?: string;    // Preview image
  error?: string;
  provider: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================================
// VIDEO GENERATION
// ============================================================

const REPLICATE_API_BASE = 'https://api.replicate.com/v1';

/**
 * Generate a dream video using Replicate's video models
 * Free tier: ~5 seconds of video per generation
 */
export async function generateDreamVideo(
  prompt: string,
  apiKey: string,
  onProgress?: (progress: number) => void,
): Promise<VideoGenerationJob> {
  const jobId = `video-${Date.now()}`;
  
  // Enhanced prompt for dream-like video
  const enhancedPrompt = `Dreamlike cinematic video: ${prompt}. Ethereal, surreal, flowing imagery with soft lighting and mystical atmosphere. Smooth camera movements, fantasy aesthetic.`;

  const job: VideoGenerationJob = {
    id: jobId,
    prompt: enhancedPrompt,
    status: 'queued',
    progress: 0,
    provider: 'replicate',
    createdAt: new Date().toISOString(),
  };

  try {
    // Submit generation request to Replicate
    // Using Stable Video Diffusion model
    const response = await fetch(`${REPLICATE_API_BASE}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'stability-ai/stable-video-diffusion-img2vid-xt',
        input: {
          prompt: enhancedPrompt,
          negative_prompt: 'blurry, low quality, distorted, ugly, text, watermark',
          num_frames: 25,
          fps: 6,
          motion_bucket_id: 127,
          cond_aug: 0.02,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status}`);
    }

    const prediction = await response.json();
    
    // Poll for completion
    const result = await pollReplicateJob(prediction.id, apiKey, onProgress);
    
    return {
      ...job,
      status: 'completed',
      progress: 100,
      videoUrl: result.output?.[0] || result.output,
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video generation failed';
    return {
      ...job,
      status: 'failed',
      error: message,
      completedAt: new Date().toISOString(),
    };
  }
}

/**
 * Generate video using HuggingFace Inference API (free, no API key needed for public models)
 */
export async function generateDreamVideoFree(
  prompt: string,
  onProgress?: (progress: number) => void,
): Promise<VideoGenerationJob> {
  const jobId = `video-free-${Date.now()}`;
  
  const enhancedPrompt = `Dreamlike cinematic video: ${prompt}. Ethereal, surreal, flowing imagery.`;

  const job: VideoGenerationJob = {
    id: jobId,
    prompt: enhancedPrompt,
    status: 'queued',
    progress: 0,
    provider: 'huggingface',
    createdAt: new Date().toISOString(),
  };

  try {
    // Use HuggingFace's free Inference API with a video model
    // Note: Free tier has rate limits and may queue
    const response = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid-xt',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: enhancedPrompt,
          parameters: {
            num_frames: 14, // Shorter for free tier
            fps: 6,
          },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 503) {
        // Model is loading, retry after delay
        await new Promise(r => setTimeout(r, 20000));
        return generateDreamVideoFree(prompt, onProgress);
      }
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    // Response is a video blob
    const blob = await response.blob();
    const videoUrl = URL.createObjectURL(blob);

    onProgress?.(100);

    return {
      ...job,
      status: 'completed',
      progress: 100,
      videoUrl,
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video generation failed';
    return {
      ...job,
      status: 'failed',
      error: message,
      completedAt: new Date().toISOString(),
    };
  }
}

/**
 * Poll a Replicate job for completion
 */
async function pollReplicateJob(
  predictionId: string,
  apiKey: string,
  onProgress?: (progress: number) => void,
  maxAttempts = 60,
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `${REPLICATE_API_BASE}/predictions/${predictionId}`,
      { headers: { 'Authorization': `Token ${apiKey}` } },
    );

    if (!response.ok) {
      throw new Error(`Poll error: ${response.status}`);
    }

    const prediction = await response.json();

    if (prediction.status === 'succeeded') {
      return prediction;
    }

    if (prediction.status === 'failed') {
      throw new Error(prediction.error || 'Generation failed');
    }

    // Update progress
    const progress = Math.min(90, Math.round((i / maxAttempts) * 100));
    onProgress?.(progress);

    // Wait before polling again
    await new Promise(r => setTimeout(r, 5000));
  }

  throw new Error('Generation timed out');
}

// ============================================================
// 3D / VR GENERATION
// ============================================================

/**
 * Generate a 3D model from a dream description using Luma AI Genie (free tier)
 * Returns a GLB file that can be viewed in Three.js
 */
export async function generateDream3D(
  prompt: string,
  apiKey: string,
  onProgress?: (progress: number) => void,
): Promise<VRGenerationJob> {
  const jobId = `vr-${Date.now()}`;

  const job: VRGenerationJob = {
    id: jobId,
    prompt,
    status: 'queued',
    progress: 0,
    provider: 'luma',
    createdAt: new Date().toISOString(),
  };

  try {
    // Luma AI Genie API
    const response = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `A 3D dreamscape: ${prompt}. Surreal, ethereal, mystical environment.`,
        aspect_ratio: '1:1',
      }),
    });

    if (!response.ok) {
      throw new Error(`Luma API error: ${response.status}`);
    }

    const generation = await response.json();

    // Poll for completion
    const result = await pollLumaJob(generation.id, apiKey, onProgress);

    return {
      ...job,
      status: 'completed',
      progress: 100,
      modelUrl: result.assets?.model,      // GLB file
      previewUrl: result.assets?.thumbnail,
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '3D generation failed';
    return {
      ...job,
      status: 'failed',
      error: message,
      completedAt: new Date().toISOString(),
    };
  }
}

/**
 * Generate 3D using Replicate's 3D models (free tier credits)
 */
export async function generateDream3DReplicate(
  prompt: string,
  apiKey: string,
  onProgress?: (progress: number) => void,
): Promise<VRGenerationJob> {
  const jobId = `vr-rep-${Date.now()}`;

  const job: VRGenerationJob = {
    id: jobId,
    prompt,
    status: 'queued',
    progress: 0,
    provider: 'replicate-3d',
    createdAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${REPLICATE_API_BASE}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'stability-ai/stable-dreamfusion:22cd1f5c',
        input: {
          prompt: `3D dreamscape: ${prompt}. Surreal, ethereal, mystical.`,
          batch_size: 1,
          inference_steps: 50,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status}`);
    }

    const prediction = await response.json();
    const result = await pollReplicateJob(prediction.id, apiKey, onProgress);

    return {
      ...job,
      status: 'completed',
      progress: 100,
      modelUrl: result.output?.[0],
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '3D generation failed';
    return {
      ...job,
      status: 'failed',
      error: message,
      completedAt: new Date().toISOString(),
    };
  }
}

/**
 * Generate a simple 3D scene client-side using Three.js
 * This is completely free and runs in the browser
 */
export function generateDreamScene3D(prompt: string): {
  sceneDescription: string;
  objects: SceneObject[];
} {
  // Parse the dream prompt for key elements
  const elements = parseDreamElements(prompt);
  
  const objects: SceneObject[] = [];
  
  // Generate scene objects based on dream elements
  for (const element of elements) {
    objects.push({
      type: element.type,
      position: {
        x: (Math.random() - 0.5) * 10,
        y: Math.random() * 3,
        z: (Math.random() - 0.5) * 10,
      },
      scale: 0.5 + Math.random() * 1.5,
      color: element.color,
      emissive: element.glowing ? element.color : undefined,
      animation: element.floating ? 'float' : element.spinning ? 'spin' : undefined,
    });
  }

  // Add ambient elements
  objects.push({
    type: 'particle-system',
    position: { x: 0, y: 2, z: 0 },
    scale: 1,
    color: '#8b5cf6',
    animation: 'drift',
  });

  return {
    sceneDescription: `Dreamscape: ${prompt}`,
    objects,
  };
}

interface SceneObject {
  type: 'sphere' | 'cube' | 'torus' | 'cylinder' | 'cone' | 'particle-system' | 'terrain' | 'water';
  position: { x: number; y: number; z: number };
  scale: number;
  color: string;
  emissive?: string;
  animation?: 'float' | 'spin' | 'pulse' | 'drift';
}

function parseDreamElements(prompt: string): Array<{
  type: SceneObject['type'];
  color: string;
  floating?: boolean;
  glowing?: boolean;
  spinning?: boolean;
}> {
  const lower = prompt.toLowerCase();

  interface DreamElement {
    type: SceneObject['type'];
    color: string;
    floating?: boolean;
    glowing?: boolean;
    spinning?: boolean;
    animation?: string;
  }

  const elements: DreamElement[] = [];
  if (lower.includes('sky') || lower.includes('star') || lower.includes('moon') || lower.includes('sun')) {
    elements.push({ type: 'sphere', color: '#fbbf24', glowing: true, floating: true });
  }
  
  // Water
  if (lower.includes('water') || lower.includes('ocean') || lower.includes('river') || lower.includes('sea')) {
    elements.push({ type: 'water', color: '#3b82f6', animation: 'drift' });
  }
  
  // Forest / nature
  if (lower.includes('forest') || lower.includes('tree') || lower.includes('garden') || lower.includes('plant')) {
    elements.push({ type: 'cone', color: '#22c55e', floating: false });
    elements.push({ type: 'sphere', color: '#86efac', floating: true });
  }
  
  // Fire
  if (lower.includes('fire') || lower.includes('flame') || lower.includes('burn')) {
    elements.push({ type: 'sphere', color: '#ef4444', glowing: true, animation: 'pulse' });
  }
  
  // Flying
  if (lower.includes('fly') || lower.includes('floating') || lower.includes('levitat')) {
    elements.push({ type: 'torus', color: '#a855f7', floating: true, spinning: true });
  }
  
  // Darkness / night
  if (lower.includes('dark') || lower.includes('night') || lower.includes('shadow')) {
    elements.push({ type: 'sphere', color: '#1e1b4b', glowing: false });
  }
  
  // Light / glow
  if (lower.includes('light') || lower.includes('glow') || lower.includes('shine') || lower.includes('bright')) {
    elements.push({ type: 'sphere', color: '#fef3c7', glowing: true, floating: true });
  }

  // Default dream elements if nothing matched
  if (elements.length === 0) {
    elements.push(
      { type: 'sphere', color: '#8b5cf6', glowing: true, floating: true },
      { type: 'torus', color: '#06b6d4', spinning: true },
      { type: 'particle-system', color: '#f472b6' },
    );
  }

  return elements;
}

async function pollLumaJob(
  generationId: string,
  apiKey: string,
  onProgress?: (progress: number) => void,
  maxAttempts = 60,
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } },
    );

    if (!response.ok) {
      throw new Error(`Luma poll error: ${response.status}`);
    }

    const data = await response.json();

    if (data.state === 'completed') {
      return data;
    }

    if (data.state === 'failed') {
      throw new Error(data.failure_reason || 'Generation failed');
    }

    onProgress?.(Math.min(90, Math.round((i / maxAttempts) * 100)));
    await new Promise(r => setTimeout(r, 3000));
  }

  throw new Error('Generation timed out');
}
